import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Eye,
} from 'lucide-react';
import { db } from '../../db/db';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';
import { ProductModal } from '../products/ProductModal';
import type { Delivery } from '../../types';

interface DashboardViewProps {
  onNavigate: (tab: 'dashboard' | 'products' | 'create' | 'history' | 'import-export' | 'settings') => void;
  onViewDeliveryNote: (delivery: Delivery) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onViewDeliveryNote }) => {
  const { settings } = useSettings();

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const deliveries = useLiveQuery(() => db.deliveries.orderBy('createdAt').reverse().toArray(), []) || [];

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Compute live real metrics
  const totalProducts = products.length;
  const totalDeliveries = deliveries.length;
  const deliveredOrders = deliveries.filter((d) => d.status === 'delivered').length;
  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending').length;
  const inTransitDeliveries = deliveries.filter((d) => d.status === 'in_transit').length;
  const cancelledDeliveries = deliveries.filter((d) => d.status === 'cancelled').length;

  const totalDeliveredValue = deliveries
    .filter((d) => d.status === 'delivered')
    .reduce((sum, d) => sum + (d.grandTotal || 0), 0);

  const recentDeliveries = deliveries.slice(0, 6);

  const statusBadges = {
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_transit: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Local Operations Hub
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5 sm:mt-2">
            Welcome to {settings.businessName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time delivery fulfillment and product dispatch overview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddProductOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Delivery</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* Total Products */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">Products</span>
            <Package className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <p className="text-xl font-bold text-slate-900 tracking-tight">{totalProducts}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">In catalogue</span>
        </div>

        {/* Total Deliveries */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">Deliveries</span>
            <Truck className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <p className="text-xl font-bold text-slate-900 tracking-tight">{totalDeliveries}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">All records</span>
        </div>

        {/* Delivered Orders */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 tracking-tight">{deliveredOrders}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Completed</span>
        </div>

        {/* In Transit */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">In Transit</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-600 tracking-tight">{inTransitDeliveries}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">On route</span>
        </div>

        {/* Pending Orders */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 tracking-tight">{pendingDeliveries}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Awaiting</span>
        </div>

        {/* Cancelled Deliveries */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">Cancelled</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-600 tracking-tight">{cancelledDeliveries}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Voided</span>
        </div>

        {/* Total Delivered Value */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium text-slate-500">Total Value</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-base font-bold text-blue-600 tracking-tight truncate">
            {formatCurrency(totalDeliveredValue, settings.currency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Delivered revenue</span>
        </div>
      </div>

      {/* Main Content Layout: Recent Deliveries & Operational Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Deliveries (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Recent Deliveries</h3>
              <p className="text-xs text-slate-400 mt-0.5">Most recent product dispatches and orders</p>
            </div>
            {deliveries.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {deliveries.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-800">No deliveries recorded yet</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                When you dispatch items and record buyers, your delivery notes and historical logs will show up
                here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Delivery</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-blue-600">
                        #{delivery.deliveryNumber}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          statusBadges[delivery.status]
                        }`}
                      >
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                      {delivery.buyer.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(delivery.createdAt, settings.dateFormat)} &bull; {delivery.totalQuantity} units (
                      {delivery.totalItems} items)
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {delivery.grandTotal > 0
                          ? formatCurrency(delivery.grandTotal, settings.currency)
                          : 'No Price'}
                      </p>
                      {delivery.buyer.city && (
                        <p className="text-xs text-slate-400">{delivery.buyer.city}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewDeliveryNote(delivery)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="View Delivery Note"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Actions & Getting Started Guide (1 col) */}
        <div className="space-y-5">
          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Quick Shortcuts
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">New Delivery</h4>
                    <p className="text-[11px] text-slate-400">Dispatch products to a buyer</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Add Product</h4>
                    <p className="text-[11px] text-slate-400">Save items, SKUs, and stock</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('import-export')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Backup & CSV Export</h4>
                    <p className="text-[11px] text-slate-400">Save local data to your computer</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Local Security & Offline Notice */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Offline Ready & Private</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-500">
              DeliverFlow operates entirely in your browser using local IndexedDB storage. You can create
              deliveries, print delivery notes, and manage stock with zero internet connection required.
            </p>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <ProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSaved={() => {}}
      />
    </div>
  );
};
