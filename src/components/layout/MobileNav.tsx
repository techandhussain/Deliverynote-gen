import React from 'react';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  History,
  FileSpreadsheet,
  Settings,
  Truck,
} from 'lucide-react';
import type { NavTab } from './Sidebar';
import { useSettings } from '../../context/SettingsContext';

interface MobileNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
  const { settings } = useSettings();

  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'products' as NavTab, label: 'Products', icon: <Package className="w-5 h-5" /> },
    { id: 'create' as NavTab, label: 'Create', icon: <PlusCircle className="w-6 h-6 text-blue-600" /> },
    { id: 'history' as NavTab, label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'settings' as NavTab, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="no-print md:hidden bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-7 h-7 object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              <Truck className="w-4 h-4" />
            </div>
          )}
          <h2 className="font-bold text-sm text-slate-900 tracking-tight truncate max-w-[200px]">
            {settings.businessName}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onTabChange('import-export')}
          className={`p-1.5 rounded-lg text-xs font-medium border ${
            activeTab === 'import-export'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'text-slate-600 border-slate-200 bg-white'
          }`}
          title="Backup / Restore"
        >
          <FileSpreadsheet className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <div className="no-print md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 px-1 pt-1.5 pb-3 flex items-center justify-around shadow-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[52px] ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="relative">{tab.icon}</div>
              <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
