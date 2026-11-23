import React, { useRef } from 'react';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Truck,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';
import type { Delivery } from '../../types';

interface DeliveryNoteViewProps {
  delivery: Delivery;
  onBack: () => void;
}

export const DeliveryNoteView: React.FC<DeliveryNoteViewProps> = ({
  delivery,
  onBack,
}) => {
  const { settings } = useSettings();
  const documentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const statusBadges = {
    delivered: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      label: 'Delivered',
    },
    in_transit: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Truck className="w-4 h-4 text-blue-600" />,
      label: 'In Transit',
    },
    pending: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      label: 'Pending',
    },
    cancelled: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <XCircle className="w-4 h-4 text-rose-600" />,
      label: 'Cancelled',
    },
  };

  const currentBadge = statusBadges[delivery.status];

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-full">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200/80">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Delivery History</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Delivery Note</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Document Wrapper (Fully Responsive on Mobile, Tablet & Desktop) */}
      <div className="flex justify-center w-full overflow-hidden">
        <div
          ref={documentRef}
          id="delivery-note-document"
          className="printable-area w-full max-w-[210mm] min-h-auto md:min-h-[297mm] bg-white border border-slate-200 shadow-xl rounded-xl p-4 sm:p-8 md:p-12 text-slate-800 flex flex-col justify-between"
          style={{ boxSizing: 'border-box' }}
        >
          <div className="space-y-6 sm:space-y-8">
            {/* Header: Business Profile & Document Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 border-b border-slate-200 pb-5 sm:pb-6">
              <div className="space-y-2 w-full sm:w-auto">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt={settings.businessName}
                    className="h-10 sm:h-12 max-w-[160px] sm:max-w-[180px] object-contain mb-2"
                  />
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                      {settings.businessName.charAt(0) || 'D'}
                    </div>
                    <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 break-words">
                      {settings.businessName}
                    </span>
                  </div>
                )}

                {settings.address && (
                  <p className="text-xs text-slate-500 flex items-start gap-1.5 max-w-xs break-words">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{settings.address}</span>
                  </p>
                )}
                {settings.phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{settings.phone}</span>
                  </p>
                )}
              </div>

              {/* Document Identity */}
              <div className="text-left sm:text-right space-y-1 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
                  DELIVERY NOTE
                </h2>
                <p className="text-xs font-mono font-semibold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-md inline-block">
                  #{delivery.deliveryNumber}
                </p>
                <div className="pt-2 text-xs text-slate-500 space-y-0.5">
                  <p>
                    <strong>Issue Date:</strong> {formatDate(delivery.createdAt, settings.dateFormat)}
                  </p>
                  {delivery.deliveredAt && (
                    <p>
                      <strong>Delivered:</strong> {formatDateTime(delivery.deliveredAt, settings.dateFormat)}
                    </p>
                  )}
                  <div className="pt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${currentBadge.bg}`}
                    >
                      {currentBadge.icon}
                      {currentBadge.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer / Recipient Details Box */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 sm:p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Deliver To (Buyer Details)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-0.5 break-words">{delivery.buyer.name}</p>
                  {delivery.buyer.address && (
                    <p className="text-slate-600 leading-relaxed break-words">{delivery.buyer.address}</p>
                  )}
                  {delivery.buyer.city && (
                    <p className="text-slate-600 font-medium">{delivery.buyer.city}</p>
                  )}
                </div>

                <div className="space-y-1 text-slate-600">
                  {delivery.buyer.phone && (
                    <p>
                      <strong className="text-slate-700">Contact:</strong> {delivery.buyer.phone}
                    </p>
                  )}
                  {delivery.receivedBy && (
                    <p>
                      <strong className="text-slate-700">Received By:</strong> {delivery.receivedBy}
                    </p>
                  )}
                  {delivery.buyer.notes && (
                    <p className="text-slate-500 italic break-words">
                      <strong className="text-slate-700 not-italic">Buyer Notes:</strong> {delivery.buyer.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Products Table - Responsive scroll wrapper for mobile & full width in print */}
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse min-w-[480px] sm:min-w-full">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2 sm:px-3">Item / Description</th>
                    <th className="py-2.5 px-2 sm:px-3 w-24 sm:w-28">SKU</th>
                    <th className="py-2.5 px-2 sm:px-3 w-16 sm:w-20 text-center">Quantity</th>
                    <th className="py-2.5 px-2 sm:px-3 w-20 sm:w-24 text-right">Unit Price</th>
                    <th className="py-2.5 px-2 sm:px-3 w-24 sm:w-28 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {delivery.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                        <span className="font-semibold text-slate-900 block sm:inline">{item.name}</span>
                        {item.isCustom && (
                          <span className="sm:ml-2 text-[10px] uppercase font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-500 inline-block mt-0.5 sm:mt-0">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 font-mono text-slate-500">{item.sku || '-'}</td>
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-medium">{item.quantity}</td>
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right">
                        {item.unitPrice > 0 ? formatCurrency(item.unitPrice, settings.currency) : '-'}
                      </td>
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right font-semibold text-slate-900">
                        {item.total > 0 ? formatCurrency(item.total, settings.currency) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial & Items Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500 space-y-1 w-full sm:max-w-sm">
                <p>
                  <strong>Total Line Items:</strong> {delivery.totalItems}
                </p>
                <p>
                  <strong>Total Pieces / Quantity:</strong> {delivery.totalQuantity} units
                </p>
                {delivery.deliveryNotes && (
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-slate-600 break-words">
                    <strong className="text-slate-800 block mb-0.5">Delivery Instructions:</strong>
                    <span>{delivery.deliveryNotes}</span>
                  </div>
                )}
              </div>

              {/* Financial Box */}
              {delivery.grandTotal > 0 || delivery.subtotal > 0 ? (
                <div className="w-full sm:w-64 space-y-2 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(delivery.subtotal, settings.currency)}
                    </span>
                  </div>
                  {delivery.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount:</span>
                      <span>-{formatCurrency(delivery.discount, settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-300">
                    <span>Grand Total:</span>
                    <span className="text-blue-600">
                      {formatCurrency(delivery.grandTotal, settings.currency)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Document Footer: Signatures & Notes */}
          <div className="pt-8 sm:pt-10 mt-6 sm:mt-8 border-t border-slate-200 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-xs">
              <div>
                <p className="text-slate-500 font-medium mb-8 sm:mb-10">Customer / Receiver Signature:</p>
                <div className="border-t border-slate-400 pt-1.5 flex justify-between text-slate-600">
                  <span>Sign & Print Name</span>
                  <span>Date: ___/___/20__</span>
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-8 sm:mb-10">Authorized Representative:</p>
                <div className="border-t border-slate-400 pt-1.5 flex justify-between text-slate-600">
                  <span>Authorized Signature</span>
                  <span>Date: ___/___/20__</span>
                </div>
              </div>
            </div>

            {/* Custom Business Footer Message */}
            <div className="text-center text-xs text-slate-400 pt-3 sm:pt-4 border-t border-slate-100">
              <p className="break-words">{settings.defaultFooterNotes}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
