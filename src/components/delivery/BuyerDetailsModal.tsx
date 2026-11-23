import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Building, CheckCircle2, PackageCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';
import type { BuyerInfo, DeliveryItem } from '../../types';

interface BuyerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DeliveryItem[];
  grandTotal: number;
  initialBuyer?: BuyerInfo;
  onConfirm: (buyer: BuyerInfo, receivedBy?: string) => Promise<void>;
  isLoading?: boolean;
}

export const BuyerDetailsModal: React.FC<BuyerDetailsModalProps> = ({
  isOpen,
  onClose,
  items,
  grandTotal,
  initialBuyer,
  onConfirm,
  isLoading = false,
}) => {
  const { settings } = useSettings();

  const [name, setName] = useState(initialBuyer?.name || '');
  const [phone, setPhone] = useState(initialBuyer?.phone || '');
  const [address, setAddress] = useState(initialBuyer?.address || '');
  const [city, setCity] = useState(initialBuyer?.city || '');
  const [notes, setNotes] = useState(initialBuyer?.notes || '');
  const [receivedBy, setReceivedBy] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialBuyer?.name || '');
      setPhone(initialBuyer?.phone || '');
      setAddress(initialBuyer?.address || '');
      setCity(initialBuyer?.city || '');
      setNotes(initialBuyer?.notes || '');
      setReceivedBy(initialBuyer?.name || '');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialBuyer]);

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return; // Prevent double submit

    if (!name.trim()) {
      setError("Buyer's Full Name is required to finalize delivery.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(
        {
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        receivedBy.trim() || undefined
      );
    } catch (err) {
      console.error('Confirmation error:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Complete Delivery & Issue Delivery Note"
      subtitle="Verify buyer details and item summary before recording as Delivered"
      maxWidth="xl"
    >
      <form onSubmit={handleConfirm} className="space-y-5">
        {/* Order Summary Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              Delivery Manifest Summary
            </span>
            <span className="text-xs font-medium text-slate-500">
              {items.length} items &bull; {totalQuantity} units
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
            {items.map((item) => (
              <div key={item.id} className="py-1.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  {item.sku && <span className="text-slate-400 font-mono ml-1.5">({item.sku})</span>}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-slate-700">Qty: {item.quantity}</span>
                  {item.unitPrice > 0 && (
                    <span className="text-slate-500 ml-2">
                      &bull; {formatCurrency(item.total, settings.currency)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {grandTotal > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-900">
              <span>Grand Total</span>
              <span className="text-blue-600">{formatCurrency(grandTotal, settings.currency)}</span>
            </div>
          )}
        </div>

        {/* Buyer Information Form */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Buyer Details & Dispatch Destination
          </h4>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Buyer's Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Johnathan Smith / Acme Corp"
                className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  error ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          {/* Phone & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                City / Region <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New York, NY"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Delivery Address <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, building, floor, gate number..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Received By / Handover recipient */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Received By / Contact Person <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of person receiving the goods"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Special Delivery Notes / Comments <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Left at front desk with security, package inspected"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting || isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Confirm Delivery & Save Note</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
