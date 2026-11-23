import React from 'react';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  History,
  FileSpreadsheet,
  Settings,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export type NavTab = 'dashboard' | 'products' | 'create' | 'history' | 'import-export' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  productsCount?: number;
  deliveriesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  productsCount = 0,
  deliveriesCount = 0,
}) => {
  const { settings } = useSettings();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'products' as NavTab,
      label: 'Products',
      icon: <Package className="w-4 h-4" />,
      badge: productsCount > 0 ? productsCount : undefined,
    },
    {
      id: 'create' as NavTab,
      label: 'Create Delivery',
      icon: <PlusCircle className="w-4 h-4" />,
      highlight: true,
    },
    {
      id: 'history' as NavTab,
      label: 'Delivery History',
      icon: <History className="w-4 h-4" />,
      badge: deliveriesCount > 0 ? deliveriesCount : undefined,
    },
    {
      id: 'import-export' as NavTab,
      label: 'Import / Export',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="no-print hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 min-h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        {settings.logo ? (
          <img src={settings.logo} alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
            <Truck className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-sm text-slate-900 tracking-tight truncate">
            {settings.businessName || 'DeliverFlow'}
          </h2>
          <span className="text-[11px] font-medium text-slate-400 block">Delivery Manager</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Local Storage Badge */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex items-center gap-2.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-700 block text-[11px]">Local IndexedDB</span>
            <span className="text-[10px] text-slate-400">Offline & Zero Cloud Cost</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
