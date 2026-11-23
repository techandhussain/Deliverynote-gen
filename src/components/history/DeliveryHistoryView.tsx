import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Calendar,
  FileText,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Plus,
  ArrowUpDown,
} from 'lucide-react';
import { db } from '../../db/db';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { restoreStockForDelivery } from '../../utils/inventory';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EditDeliveryModal } from './EditDeliveryModal';
import { BuyerDetailsModal } from '../delivery/BuyerDetailsModal';
import { deductStockForDelivery } from '../../utils/inventory';
import type { Delivery, DeliveryStatus, BuyerInfo } from '../../types';

interface DeliveryHistoryViewProps {
  onViewDeliveryNote: (delivery: Delivery) => void;
  onNavigateToCreate: () => void;
}

export const DeliveryHistoryView: React.FC<DeliveryHistoryViewProps> = ({
  onViewDeliveryNote,
  onNavigateToCreate,
}) => {
  const { settings } = useSettings();
  const toast = useToast();

  const deliveries = useLiveQuery(() => db.deliveries.orderBy('createdAt').reverse().toArray(), []) || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'deliveryNumber' | 'grandTotal' | 'buyerName'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick mark delivered
  const [deliveryToDeliver, setDeliveryToDeliver] = useState<Delivery | null>(null);

  // Filtered & sorted data
  const filteredDeliveries = useMemo(() => {
    return deliveries
      .filter((d) => {
        // Search filter (buyer name, DN number, product name)
        const term = searchTerm.toLowerCase().trim();
        if (term) {
          const matchesBuyer = d.buyer.name.toLowerCase().includes(term);
          const matchesNumber = d.deliveryNumber.toLowerCase().includes(term);
          const matchesCity = d.buyer.city?.toLowerCase().includes(term);
          const matchesProduct = d.items.some((i) =>
            i.name.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term)
          );

          if (!matchesBuyer && !matchesNumber && !matchesCity && !matchesProduct) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && d.status !== statusFilter) {
          return false;
        }

        // Date range filter
        if (fromDate) {
          const created = new Date(d.createdAt).setHours(0, 0, 0, 0);
          const from = new Date(fromDate).setHours(0, 0, 0, 0);
          if (created < from) return false;
        }

        if (toDate) {
          const created = new Date(d.createdAt).setHours(23, 59, 59, 999);
          const to = new Date(toDate).setHours(23, 59, 59, 999);
          if (created > to) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof Delivery];
        let valB: any = b[sortField as keyof Delivery];

        if (sortField === 'buyerName') {
          valA = a.buyer.name.toLowerCase();
          valB = b.buyer.name.toLowerCase();
        } else if (sortField === 'createdAt') {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        } else {
          valA = valA ?? 0;
          valB = valB ?? 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [deliveries, searchTerm, statusFilter, fromDate, toDate, sortField, sortDirection]);

  const toggleSort = (field: 'createdAt' | 'deliveryNumber' | 'grandTotal' | 'buyerName') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deliveryToDelete) return;
    setIsDeleting(true);
    try {
      // If stock was deducted for this delivery, restore it
      if (settings.inventoryTracking && deliveryToDelete.stockDeducted) {
        await restoreStockForDelivery(deliveryToDelete.items);
      }

      await db.deliveries.delete(deliveryToDelete.id);
      toast.success(
        'Delivery Record Removed',
        `Delivery note #${deliveryToDelete.deliveryNumber} was deleted.`
      );
      setDeliveryToDelete(null);
    } catch (err) {
      console.error('Delete delivery failed:', err);
      toast.error('Delete Failed', 'Could not delete delivery record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick mark delivered confirmation
  const handleConfirmQuickDeliver = async (confirmedBuyer: BuyerInfo, receivedBy?: string) => {
    if (!deliveryToDeliver) return;

    try {
      const now = new Date().toISOString();
      let stockDeducted = deliveryToDeliver.stockDeducted;

      if (settings.inventoryTracking && !stockDeducted) {
        await deductStockForDelivery(deliveryToDeliver.items);
        stockDeducted = true;
      }

      await db.deliveries.update(deliveryToDeliver.id, {
        status: 'delivered',
        buyer: confirmedBuyer,
        receivedBy: receivedBy || confirmedBuyer.name,
        deliveredAt: now,
        stockDeducted,
        updatedAt: now,
      });

      toast.success('Marked as Delivered', `Delivery #${deliveryToDeliver.deliveryNumber} is now Delivered.`);
      setDeliveryToDeliver(null);
    } catch (err) {
      console.error('Error marking delivered:', err);
      toast.error('Error', 'Failed to update delivery to delivered.');
    }
  };

  const statusBadges: Record<DeliveryStatus, { bg: string; text: string; icon: any; label: string }> = {
    delivered: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'Delivered',
    },
    in_transit: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: <Truck className="w-3.5 h-3.5 text-blue-600" />,
      label: 'In Transit',
    },
    pending: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
      label: 'Pending',
    },
    cancelled: {
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-700',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
      label: 'Cancelled',
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Delivery History</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Browse, search, review, and reprint past delivery notes and manifests
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToCreate}
          className="px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by buyer, note # (e.g. DN-202611), or item name..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
            {[
              { id: 'all', label: 'All' },
              { id: 'delivered', label: 'Delivered' },
              { id: 'in_transit', label: 'In Transit' },
              { id: 'pending', label: 'Pending' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Date Range:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[135px]"
              title="From date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[135px]"
              title="To date"
            />
          </div>

          {(fromDate || toDate || searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setFromDate('');
                setToDate('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium sm:ml-auto self-start sm:self-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Delivery Records List / Table */}
      {deliveries.length === 0 ? (
        /* Empty Database State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Delivery Records Saved Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6 leading-relaxed">
            Every delivery you dispatch and mark as delivered will be archived here locally with complete
            manifest items, buyer details, and printable delivery notes.
          </p>
          <button
            type="button"
            onClick={onNavigateToCreate}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Delivery</span>
          </button>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        /* Zero Filter Results State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No matching deliveries</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            No records match your active search terms or date parameters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setFromDate('');
              setToDate('');
            }}
            className="px-4 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        /* Records Table & Cards */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort('deliveryNumber')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Delivery #</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort('buyerName')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Buyer / Destination</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Items & Qty</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => toggleSort('grandTotal')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Grand Total</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDeliveries.map((delivery) => {
                  const badge = statusBadges[delivery.status];

                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Delivery Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => onViewDeliveryNote(delivery)}
                          className="hover:text-blue-600 transition-colors text-left"
                        >
                          #{delivery.deliveryNumber}
                        </button>
                      </td>

                      {/* Buyer Name & City */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{delivery.buyer.name}</p>
                        {delivery.buyer.city && (
                          <p className="text-xs text-slate-400">{delivery.buyer.city}</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(delivery.createdAt, settings.dateFormat)}
                      </td>

                      {/* Items & Qty */}
                      <td className="py-3.5 px-4 text-center text-xs">
                        <span className="font-semibold text-slate-800">{delivery.totalQuantity} units</span>
                        <span className="text-slate-400 block text-[11px]">
                          ({delivery.totalItems} distinct items)
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {delivery.grandTotal > 0
                          ? formatCurrency(delivery.grandTotal, settings.currency)
                          : '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => setDeliveryToDeliver(delivery)}
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors mr-1"
                              title="Mark as Delivered"
                            >
                              Deliver
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewDeliveryNote(delivery)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="View Delivery Note"
                            title="View Delivery Note"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDelivery(delivery)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="Edit Delivery"
                            title="Edit Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryToDelete(delivery)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            aria-label="Delete Delivery"
                            title="Delete Delivery"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredDeliveries.map((delivery) => {
              const badge = statusBadges[delivery.status];

              return (
                <div key={delivery.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-blue-600">
                        #{delivery.deliveryNumber}
                      </span>
                      <h4 className="font-semibold text-slate-900 text-sm mt-0.5">
                        {delivery.buyer.name}
                      </h4>
                      {delivery.buyer.city && (
                        <p className="text-xs text-slate-400">{delivery.buyer.city}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(delivery.createdAt, settings.dateFormat)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                    <span>
                      {delivery.totalItems} items ({delivery.totalQuantity} units)
                    </span>
                    <span className="font-semibold text-slate-900">
                      {delivery.grandTotal > 0
                        ? formatCurrency(delivery.grandTotal, settings.currency)
                        : 'No Price'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {delivery.status !== 'delivered' && delivery.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => setDeliveryToDeliver(delivery)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg"
                      >
                        Mark Delivered
                      </button>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDeliveryNote(delivery)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                        title="View Note"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDelivery(delivery)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryToDelete(delivery)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredDeliveries.length} of {deliveries.length} records
            </span>
            <span className="font-medium text-slate-700">
              Total Volume:{' '}
              {formatCurrency(
                filteredDeliveries.reduce((sum, d) => sum + (d.grandTotal || 0), 0),
                settings.currency
              )}
            </span>
          </div>
        </div>
      )}

      {/* Edit Delivery Modal */}
      <EditDeliveryModal
        isOpen={!!editingDelivery}
        onClose={() => setEditingDelivery(null)}
        delivery={editingDelivery}
        onSaved={() => {}}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deliveryToDelete}
        onClose={() => setDeliveryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Delivery Record"
        message={`Are you sure you want to delete delivery #${deliveryToDelete?.deliveryNumber}? ${
          settings.inventoryTracking && deliveryToDelete?.stockDeducted
            ? 'Any previously deducted product stock will be automatically restored.'
            : ''
        }`}
        confirmLabel="Delete Delivery"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Quick Mark Delivered Modal */}
      {deliveryToDeliver && (
        <BuyerDetailsModal
          isOpen={!!deliveryToDeliver}
          onClose={() => setDeliveryToDeliver(null)}
          items={deliveryToDeliver.items}
          grandTotal={deliveryToDeliver.grandTotal}
          initialBuyer={deliveryToDeliver.buyer}
          onConfirm={handleConfirmQuickDeliver}
        />
      )}
    </div>
  );
};
