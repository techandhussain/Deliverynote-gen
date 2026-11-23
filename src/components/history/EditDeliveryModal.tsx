import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db/db';
import { deductStockForDelivery, restoreStockForDelivery } from '../../utils/inventory';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import type { Delivery, DeliveryStatus } from '../../types';

interface EditDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  onSaved: () => void;
}

export const EditDeliveryModal: React.FC<EditDeliveryModalProps> = ({
  isOpen,
  onClose,
  delivery,
  onSaved,
}) => {
  const { settings } = useSettings();
  const toast = useToast();

  const [status, setStatus] = useState<DeliveryStatus>('pending');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (delivery && isOpen) {
      setStatus(delivery.status);
      setBuyerName(delivery.buyer.name || '');
      setBuyerPhone(delivery.buyer.phone || '');
      setBuyerAddress(delivery.buyer.address || '');
      setBuyerCity(delivery.buyer.city || '');
      setBuyerNotes(delivery.buyer.notes || '');
      setReceivedBy(delivery.receivedBy || '');
      setDeliveryNotes(delivery.deliveryNotes || '');
    }
  }, [delivery, isOpen]);

  if (!delivery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!buyerName.trim()) {
      toast.warning('Validation', "Buyer's Full Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      let updatedStockDeducted = delivery.stockDeducted;
      let deliveredAt = delivery.deliveredAt;

      // Handle stock adjustment when status changes
      if (settings.inventoryTracking) {
        if (status === 'delivered' && !delivery.stockDeducted) {
          // Status changed to Delivered: deduct stock
          await deductStockForDelivery(delivery.items);
          updatedStockDeducted = true;
          deliveredAt = now;
        } else if (
          (status === 'cancelled' || status === 'pending' || status === 'in_transit') &&
          delivery.stockDeducted
        ) {
          // Status changed from Delivered to something else: restore stock
          await restoreStockForDelivery(delivery.items);
          updatedStockDeducted = false;
          if (status === 'cancelled') {
            deliveredAt = undefined;
          }
        }
      }

      await db.deliveries.update(delivery.id, {
        status,
        buyer: {
          name: buyerName.trim(),
          phone: buyerPhone.trim() || undefined,
          address: buyerAddress.trim() || undefined,
          city: buyerCity.trim() || undefined,
          notes: buyerNotes.trim() || undefined,
        },
        receivedBy: receivedBy.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        stockDeducted: updatedStockDeducted,
        deliveredAt,
        updatedAt: now,
      });

      toast.success(
        'Delivery Record Updated',
        `Changes to note #${delivery.deliveryNumber} saved locally.`
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update delivery:', err);
      toast.error('Update Failed', 'An error occurred while saving the delivery update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Delivery #${delivery.deliveryNumber}`}
      subtitle="Modify delivery status, buyer destination, or notes"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Delivery Status
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'pending', label: 'Pending', color: 'border-amber-300 text-amber-700 bg-amber-50/50' },
              { id: 'in_transit', label: 'In Transit', color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
              { id: 'delivered', label: 'Delivered', color: 'border-emerald-300 text-emerald-700 bg-emerald-50/50' },
              { id: 'cancelled', label: 'Cancelled', color: 'border-rose-300 text-rose-700 bg-rose-50/50' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatus(st.id as DeliveryStatus)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  status === st.id
                    ? `${st.color} ring-2 ring-blue-500/20 font-bold shadow-xs`
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buyer Information */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Buyer & Recipient Details
          </h4>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Buyer's Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={buyerCity}
                onChange={(e) => setBuyerCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Address</label>
            <textarea
              rows={2}
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Received By</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of receiver"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Instructions / Notes</label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Special instructions"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
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
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>Save Updates</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
