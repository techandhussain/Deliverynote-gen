import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { Sidebar, type NavTab } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { CreateDeliveryView } from './components/delivery/CreateDeliveryView';
import { DeliveryNoteView } from './components/delivery/DeliveryNoteView';
import { DeliveryHistoryView } from './components/history/DeliveryHistoryView';
import { ImportExportView } from './components/import-export/ImportExportView';
import { SettingsView } from './components/settings/SettingsView';
import type { Delivery } from './types';

export const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [initialProductIdForCreate, setInitialProductIdForCreate] = useState<string | undefined>(undefined);
  const [activeDeliveryNote, setActiveDeliveryNote] = useState<Delivery | null>(null);

  // Live count for sidebar badges
  const productsCount = useLiveQuery(() => db.products.count(), []) || 0;
  const deliveriesCount = useLiveQuery(() => db.deliveries.count(), []) || 0;

  // Handle navigate to create delivery with pre-selected item
  const handleNavigateToCreateDelivery = (selectedProductId?: string) => {
    setInitialProductIdForCreate(selectedProductId);
    setActiveDeliveryNote(null);
    setActiveTab('create');
  };

  // Handle viewing delivery note
  const handleViewDeliveryNote = (delivery: Delivery) => {
    setActiveDeliveryNote(delivery);
  };

  // Close delivery note and return to history
  const handleBackFromDeliveryNote = () => {
    setActiveDeliveryNote(null);
    setActiveTab('history');
  };

  // Delivery created callback -> immediately show the generated delivery note!
  const handleDeliveryCreated = (newDelivery: Delivery) => {
    setInitialProductIdForCreate(undefined);
    setActiveDeliveryNote(newDelivery);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveDeliveryNote(null);
          setActiveTab(tab);
        }}
        productsCount={productsCount}
        deliveriesCount={deliveriesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Mobile Navigation Bars */}
        <MobileNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveDeliveryNote(null);
            setActiveTab(tab);
          }}
        />

        {/* Dynamic Section View */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeDeliveryNote ? (
            <DeliveryNoteView
              delivery={activeDeliveryNote}
              onBack={handleBackFromDeliveryNote}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  onNavigate={(tab) => setActiveTab(tab)}
                  onViewDeliveryNote={handleViewDeliveryNote}
                />
              )}

              {activeTab === 'products' && (
                <ProductsView
                  onNavigateToCreateDelivery={handleNavigateToCreateDelivery}
                />
              )}

              {activeTab === 'create' && (
                <CreateDeliveryView
                  initialProductId={initialProductIdForCreate}
                  onDeliveryCreated={handleDeliveryCreated}
                  onNavigateToHistory={() => {
                    setActiveDeliveryNote(null);
                    setActiveTab('history');
                  }}
                />
              )}

              {activeTab === 'history' && (
                <DeliveryHistoryView
                  onViewDeliveryNote={handleViewDeliveryNote}
                  onNavigateToCreate={() => {
                    setInitialProductIdForCreate(undefined);
                    setActiveDeliveryNote(null);
                    setActiveTab('create');
                  }}
                />
              )}

              {activeTab === 'import-export' && <ImportExportView />}

              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </SettingsProvider>
  );
}
