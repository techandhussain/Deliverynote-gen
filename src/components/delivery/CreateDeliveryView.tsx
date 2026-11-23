import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Trash2,
  Package,
  AlertCircle,
  Truck,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { db, generateDeliveryNumber } from '../../db/db';
import { formatCurrency, generateId } from '../../utils/formatters';
import { deductStockForDelivery, validateStockAvailability } from '../../utils/inventory';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { BuyerDetailsModal } from './BuyerDetailsModal';
import type { Delivery, DeliveryItem, BuyerInfo } from '../../types';

interface CreateDeliveryViewProps {
  initialProductId?: string;
  onDeliveryCreated: (delivery: Delivery) => void;
  onNavigateToHistory: () => void;
}

export const CreateDeliveryView: React.FC<CreateDeliveryViewProps> = ({
  initialProductId,
  onDeliveryCreated,
  onNavigateToHistory,
}) => {
  const { settings } = useSettings();
  const toast = useToast();

  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  // Items list
  const [items, setItems] = useState<DeliveryItem[]>([]);

  // Selected catalog product to add
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Custom one-off item state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');

  // Buyer Info state
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');

  // Delivery Notes & Discount
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [discount, setDiscount] = useState<string>('0');

  // Modals & submission state
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Auto-add initial product if directed from Products view
  useEffect(() => {
    if (initialProductId && products.length > 0 && items.length === 0) {
      const prod = products.find((p) => p.id === initialProductId);
      if (prod) {
        setItems([
          {
            id: generateId('item'),
            productId: prod.id,
            name: prod.name,
            sku: prod.sku,
            quantity: 1,
            unitPrice: prod.price ?? 0,
            total: prod.price ?? 0,
            isCustom: false,
          },
        ]);
      }
    }
  }, [initialProductId, products]);

  // Calculations
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const numericDiscount = Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal - numericDiscount);

  // Add catalog product to items list
  const handleAddCatalogProduct = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    // Check if already in items list
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + 1;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = newQty * updated[existingIndex].unitPrice;
      setItems(updated);
      toast.info('Item Updated', `Increased quantity of "${prod.name}" to ${newQty}.`);
    } else {
      const newItem: DeliveryItem = {
        id: generateId('item'),
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: 1,
        unitPrice: prod.price ?? 0,
        total: prod.price ?? 0,
        isCustom: false,
      };
      setItems((prev) => [...prev, newItem]);
      toast.success('Product Added', `"${prod.name}" added to delivery.`);
    }

    setSelectedProductId('');
  };

  // Add custom one-off item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.warning('Validation', 'Please enter a name for the custom item.');
      return;
    }

    const qty = Math.max(1, Number(customQty) || 1);
    const price = Math.max(0, Number(customPrice) || 0);

    const newItem: DeliveryItem = {
      id: generateId('custom_item'),
      name: customName.trim(),
      sku: customSku.trim() || undefined,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
      isCustom: true,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomName('');
    setCustomSku('');
    setCustomPrice('');
    setCustomQty('1');
    setIsAddingCustom(false);
    toast.success('Custom Item Added', `Added "${newItem.name}" to delivery.`);
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, newQtyStr: string) => {
    const qty = Math.max(1, parseInt(newQtyStr, 10) || 1);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: qty,
              total: qty * item.unitPrice,
            }
          : item
      )
    );
  };

  // Update item unit price
  const handleUpdatePrice = (itemId: string, newPriceStr: string) => {
    const price = Math.max(0, parseFloat(newPriceStr) || 0);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              unitPrice: price,
              total: item.quantity * price,
            }
          : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Validate base delivery requirements
  const validateBase = async (): Promise<boolean> => {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('Please add at least one product to the delivery.');
    }

    // Inventory tracking check
    if (settings.inventoryTracking) {
      const stockCheck = await validateStockAvailability(items);
      if (!stockCheck.valid) {
        errors.push(...stockCheck.errors);
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Save as Pending or In Transit
  const handleSaveDraft = async (status: 'pending' | 'in_transit') => {
    if (isSaving) return;

    if (items.length === 0) {
      toast.warning('Empty Delivery', 'Please add at least one product before saving.');
      return;
    }

    if (!buyerName.trim()) {
      toast.warning('Buyer Required', "Please enter the buyer's name.");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const deliveryNumber = await generateDeliveryNumber();

      const newDelivery: Delivery = {
        id: generateId('deliv'),
        deliveryNumber,
        status,
        items,
        totalItems,
        totalQuantity,
        subtotal,
        discount: numericDiscount,
        grandTotal,
        deliveryNotes: deliveryNotes.trim() || undefined,
        buyer: {
          name: buyerName.trim(),
          phone: buyerPhone.trim() || undefined,
          address: buyerAddress.trim() || undefined,
          city: buyerCity.trim() || undefined,
          notes: buyerNotes.trim() || undefined,
        },
        createdAt: now,
        updatedAt: now,
        stockDeducted: false,
      };

      await db.deliveries.add(newDelivery);
      toast.success(
        status === 'in_transit' ? 'Delivery Dispatched' : 'Delivery Saved as Pending',
        `Record created with number ${deliveryNumber}.`
      );

      onDeliveryCreated(newDelivery);
    } catch (err) {
      console.error('Failed to create delivery:', err);
      toast.error('Error', 'Failed to save delivery to local storage.');
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Mark as Delivered modal
  const handleStartDelivered = async () => {
    const isValid = await validateBase();
    if (!isValid) return;
    setIsBuyerModalOpen(true);
  };

  // Final confirmation of "Mark as Delivered"
  const handleConfirmDelivered = async (confirmedBuyer: BuyerInfo, receivedBy?: string) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const deliveryNumber = await generateDeliveryNumber();

      // Deduct stock if inventory tracking is enabled
      let stockDeducted = false;
      if (settings.inventoryTracking) {
        await deductStockForDelivery(items);
        stockDeducted = true;
      }

      const deliveredRecord: Delivery = {
        id: generateId('deliv'),
        deliveryNumber,
        status: 'delivered',
        items,
        totalItems,
        totalQuantity,
        subtotal,
        discount: numericDiscount,
        grandTotal,
        deliveryNotes: deliveryNotes.trim() || undefined,
        buyer: confirmedBuyer,
        createdAt: now,
        updatedAt: now,
        deliveredAt: now,
        receivedBy: receivedBy || confirmedBuyer.name,
        stockDeducted,
      };

      await db.deliveries.add(deliveredRecord);
      toast.success(
        'Delivery Confirmed & Delivered!',
        `Delivery Note ${deliveryNumber} has been generated and saved locally.`
      );

      setIsBuyerModalOpen(false);
      onDeliveryCreated(deliveredRecord);
    } catch (err) {
      console.error('Failed to mark delivered:', err);
      toast.error('Delivery Error', 'Failed to record delivered order.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Create New Delivery</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Build delivery manifest, configure quantities, prices, and record buyer details
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToHistory}
          className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto"
        >
          View Delivery History
        </button>
      </div>

      {/* Validation banner */}
      {formErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Please resolve the following before proceeding:</span>
          </div>
          <ul className="list-disc list-inside text-xs pl-2 space-y-0.5 text-rose-700">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main 2-Column Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Items & Manifest) - 2 cols wide on desktop */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Select Delivery Items
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isAddingCustom ? 'Cancel Custom Item' : '+ Add One-Time Custom Item'}
              </button>
            </div>

            {/* Custom Item Form */}
            {isAddingCustom && (
              <form
                onSubmit={handleAddCustomItem}
                className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">Add Non-Catalogue Custom Item</span>
                  <span className="text-[11px] text-blue-700 font-medium">Will not be added to product catalogue</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Item name (e.g. Rush Courier Fee)*"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Price (${settings.currency})`}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Add to Delivery
                  </button>
                </div>
              </form>
            )}

            {/* Catalog Selector Dropdown & Add Button */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer"
                >
                  <option value="">-- Choose product from catalogue ({products.length} available) --</option>
                  {products.map((p) => {
                    const priceText = p.price !== undefined ? ` - ${formatCurrency(p.price, settings.currency)}` : '';
                    const stockText =
                      settings.inventoryTracking && p.stock !== undefined
                        ? ` (Stock: ${p.stock})`
                        : '';
                    const skuText = p.sku ? ` [${p.sku}]` : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {skuText}
                        {priceText}
                        {stockText}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddCatalogProduct}
                disabled={!selectedProductId}
                className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Items Manifest Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Manifest Items ({items.length})
              </h3>
              <span className="text-xs text-slate-500">
                Total Quantity: <strong className="text-slate-800">{totalQuantity}</strong>
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No items added to this delivery yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Select a product above or add a one-off item to build your delivery manifest.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Items Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Item</th>
                        <th className="py-2.5 px-4 w-28 text-center">Qty</th>
                        <th className="py-2.5 px-4 w-32 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 w-32 text-right">Subtotal</th>
                        <th className="py-2.5 px-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{item.name}</span>
                              {item.isCustom && (
                                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                  Custom
                                </span>
                              )}
                            </div>
                            {item.sku && <p className="text-xs text-slate-400 font-mono">{item.sku}</p>}
                          </td>

                          {/* Quantity input */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                              className="w-20 px-2 py-1 text-center text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                            />
                          </td>

                          {/* Unit price input */}
                          <td className="py-3 px-4 text-right">
                            <div className="relative inline-block w-28">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                {settings.currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                                className="w-full pl-6 pr-2 py-1 text-right text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                              />
                            </div>
                          </td>

                          {/* Line total */}
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            {formatCurrency(item.total, settings.currency)}
                          </td>

                          {/* Remove line */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              aria-label="Remove item"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Items Cards (Phone-optimized touch UI) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
                            {item.isCustom && (
                              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                Custom
                              </span>
                            )}
                          </div>
                          {item.sku && <p className="text-xs text-slate-400 font-mono mt-0.5">{item.sku}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium block mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-center bg-white border border-slate-200 rounded-lg font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium block mb-1">Unit Price ({settings.currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-right bg-white border border-slate-200 rounded-lg font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Subtotal:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(item.total, settings.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Calculations & Discount Footer */}
            {items.length > 0 && (
              <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1 max-w-xs space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Optional Discount ({settings.currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      {settings.currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-sm pt-2 sm:pt-0">
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Subtotal ({totalQuantity} units):</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(subtotal, settings.currency)}
                    </span>
                  </div>
                  {numericDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 text-xs font-medium">
                      <span>Discount Applied:</span>
                      <span>-{formatCurrency(numericDiscount, settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="text-blue-600">{formatCurrency(grandTotal, settings.currency)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Notes & Instructions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Special Delivery Instructions / Internal Notes
            </label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Fragile items - handle with care, gate code #4120, call recipient upon arrival..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>
        </div>

        {/* Right Column: Buyer Details & Dispatch Actions (1 col wide) */}
        <div className="space-y-5">
          {/* Buyer Details Form Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Buyer Details
            </h3>

            {/* Buyer Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Buyer's Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Acme Industries / Sarah Connor"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                City / Destination Region <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={buyerCity}
                onChange={(e) => setBuyerCity(e.target.value)}
                placeholder="e.g. Chicago, IL"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Delivery Address <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Street address, building, suite..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Buyer Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Buyer Delivery Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                placeholder="e.g. Leave package with front desk"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Action Decision Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Status & Finalization
            </h3>

            {/* Primary Action: Mark as Delivered */}
            <button
              type="button"
              onClick={handleStartDelivered}
              disabled={items.length === 0 || isSaving}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Mark as Delivered</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center leading-tight">
              Opens verification modal, generates official delivery note & records handover.
            </p>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[11px] font-semibold text-slate-400 uppercase">
                or save status
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Secondary Actions: Dispatch (In Transit) or Save as Pending */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSaveDraft('in_transit')}
                disabled={items.length === 0 || isSaving}
                className="py-2 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>In Transit</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveDraft('pending')}
                disabled={items.length === 0 || isSaving}
                className="py-2 px-3 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Buyer Details Modal for Final Delivered Mark */}
      <BuyerDetailsModal
        isOpen={isBuyerModalOpen}
        onClose={() => setIsBuyerModalOpen(false)}
        items={items}
        grandTotal={grandTotal}
        initialBuyer={{
          name: buyerName,
          phone: buyerPhone,
          address: buyerAddress,
          city: buyerCity,
          notes: buyerNotes,
        }}
        onConfirm={handleConfirmDelivered}
        isLoading={isSaving}
      />
    </div>
  );
};
