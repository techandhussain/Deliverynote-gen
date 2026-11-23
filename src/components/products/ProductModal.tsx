import React, { useState, useEffect } from 'react';
import { Upload, X, Package, DollarSign, Layers, Tag } from 'lucide-react';
import { Modal } from '../common/Modal';
import { db } from '../../db/db';
import { generateId } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import type { Product } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSaved: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaved,
}) => {
  const { settings } = useSettings();
  const toast = useToast();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setSku(productToEdit.sku || '');
      setDescription(productToEdit.description || '');
      setPrice(productToEdit.price !== undefined ? String(productToEdit.price) : '');
      setStock(productToEdit.stock !== undefined ? String(productToEdit.stock) : '');
      setCategory(productToEdit.category || '');
      setImage(productToEdit.image || '');
    } else {
      setName('');
      setSku('');
      setDescription('');
      setPrice('');
      setStock('');
      setCategory('');
      setImage('');
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Image too large', 'Please select an image smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validate = async (): Promise<boolean> => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Product name is required';
    }

    if (price && (isNaN(Number(price)) || Number(price) < 0)) {
      errs.price = 'Price must be a valid non-negative number';
    }

    if (stock && (isNaN(Number(stock)) || Number(stock) < 0)) {
      errs.stock = 'Stock must be a valid non-negative number';
    }

    if (sku.trim()) {
      // Check for duplicate SKU among other products
      const existing = await db.products.where('sku').equalsIgnoreCase(sku.trim()).first();
      if (existing && (!productToEdit || existing.id !== productToEdit.id)) {
        errs.sku = `SKU "${sku.trim()}" is already assigned to "${existing.name}"`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const isValid = await validate();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const numPrice = price.trim() !== '' ? Number(price) : undefined;
      const numStock = stock.trim() !== '' ? Math.floor(Number(stock)) : undefined;

      if (productToEdit) {
        await db.products.update(productToEdit.id, {
          name: name.trim(),
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
          price: numPrice,
          stock: numStock,
          category: category.trim() || undefined,
          image: image || undefined,
          updatedAt: now,
        });
        toast.success('Product Updated', `"${name.trim()}" has been updated successfully.`);
      } else {
        const newProduct: Product = {
          id: generateId('prod'),
          name: name.trim(),
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
          price: numPrice,
          stock: numStock,
          category: category.trim() || undefined,
          image: image || undefined,
          createdAt: now,
          updatedAt: now,
        };
        await db.products.add(newProduct);
        toast.success('Product Added', `"${name.trim()}" has been added to your catalogue.`);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      toast.error('Save Failed', 'An error occurred while saving the product to local storage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product' : 'Add New Product'}
      subtitle={productToEdit ? 'Update product details in your catalogue' : 'Add an item to your local product inventory'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Package className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wireless Ergonomic Mouse"
              className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                errors.name ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
        </div>

        {/* SKU & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Product SKU / ID <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. ELEC-0042"
                className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  errors.sku ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.sku && <p className="text-xs text-rose-500 mt-1">{errors.sku}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Electronics, Supplies"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Price & Available Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Unit Price ({settings.currency}) <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  errors.price ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.price && <p className="text-xs text-rose-500 mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Available Stock <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="e.g. 50"
              className={`w-full px-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                errors.stock ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
            {errors.stock && <p className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <div className="relative">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any technical specs, dimensions, notes..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Product Image */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Product Image <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <div className="flex items-center gap-4">
            {image ? (
              <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 shrink-0">
                <Package className="w-5 h-5 text-slate-300" />
              </div>
            )}
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WEBP (Max 2MB). Stored safely on this device.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>{productToEdit ? 'Save Changes' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
