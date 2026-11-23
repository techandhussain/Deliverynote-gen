import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { db } from '../../db/db';
import { generateId } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import type { Product, Delivery, BusinessSettings } from '../../types';

interface CsvParsedRow {
  index: number;
  name: string;
  sku?: string;
  price?: number;
  stock?: number;
  category?: string;
  description?: string;
  isValid: boolean;
  errors: string[];
}

export const ImportExportView: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const toast = useToast();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvProductsInputRef = useRef<HTMLInputElement>(null);

  // JSON Import State
  const [jsonBackupData, setJsonBackupData] = useState<{
    version?: string;
    products?: Product[];
    deliveries?: Delivery[];
    settings?: BusinessSettings;
  } | null>(null);
  const [jsonConflictInfo, setJsonConflictInfo] = useState<{
    existingProducts: number;
    existingDeliveries: number;
    incomingProducts: number;
    incomingDeliveries: number;
    duplicateProductIds: number;
    duplicateDeliveryIds: number;
  } | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  // CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvParsedRow[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');

  // Loading States
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================

  // Full JSON Database Backup
  const handleExportFullJson = async () => {
    setIsExporting(true);
    try {
      const allProducts = await db.products.toArray();
      const allDeliveries = await db.deliveries.toArray();
      const currentSettings = await db.settings.get('default');

      const backupObject = {
        app: 'DeliverFlow',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        productsCount: allProducts.length,
        deliveriesCount: allDeliveries.length,
        data: {
          settings: currentSettings,
          products: allProducts,
          deliveries: allDeliveries,
        },
      };

      const jsonStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `deliverflow_backup_${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        'Database Backup Complete',
        `Exported ${allProducts.length} products and ${allDeliveries.length} deliveries.`
      );
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Backup Failed', 'Could not export database backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Products to CSV
  const handleExportProductsCsv = async () => {
    try {
      const allProducts = await db.products.toArray();
      if (allProducts.length === 0) {
        toast.warning('No Products', 'Your product catalogue is empty. Nothing to export.');
        return;
      }

      const rows = allProducts.map((p) => ({
        'Product Name': p.name,
        SKU: p.sku || '',
        Category: p.category || '',
        'Unit Price': p.price !== undefined ? p.price : '',
        'Available Stock': p.stock !== undefined ? p.stock : '',
        Description: p.description || '',
        'Created Date': p.createdAt,
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV Exported', `Exported ${allProducts.length} products to CSV.`);
    } catch (err) {
      console.error('Products CSV export failed:', err);
      toast.error('Export Failed', 'Could not export products to CSV.');
    }
  };

  // Export Deliveries to CSV
  const handleExportDeliveriesCsv = async () => {
    try {
      const allDeliveries = await db.deliveries.toArray();
      if (allDeliveries.length === 0) {
        toast.warning('No Deliveries', 'Delivery history is empty. Nothing to export.');
        return;
      }

      const rows = allDeliveries.map((d) => ({
        'Delivery Note Number': d.deliveryNumber,
        Status: d.status.toUpperCase(),
        'Buyer Full Name': d.buyer.name,
        'Buyer Phone': d.buyer.phone || '',
        'Buyer City': d.buyer.city || '',
        'Delivery Address': d.buyer.address || '',
        'Total Items': d.totalItems,
        'Total Quantity': d.totalQuantity,
        Subtotal: d.subtotal,
        Discount: d.discount,
        'Grand Total': d.grandTotal,
        'Received By': d.receivedBy || '',
        'Date Created': d.createdAt,
        'Date Delivered': d.deliveredAt || '',
        'Delivery Notes': d.deliveryNotes || '',
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `deliveries_history_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV Exported', `Exported ${allDeliveries.length} delivery records.`);
    } catch (err) {
      console.error('Deliveries CSV export failed:', err);
      toast.error('Export Failed', 'Could not export delivery history to CSV.');
    }
  };

  // ==========================================
  // JSON BACKUP IMPORT & RESTORE
  // ==========================================

  const handleJsonFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Validate structure
      const products = parsed.data?.products || parsed.products;
      const deliveries = parsed.data?.deliveries || parsed.deliveries;
      const parsedSettings = parsed.data?.settings || parsed.settings;

      if (!Array.isArray(products) && !Array.isArray(deliveries)) {
        toast.error('Invalid Backup File', 'The selected file does not appear to be a valid DeliverFlow backup.');
        return;
      }

      // Check existing database records
      const existingProducts = await db.products.toArray();
      const existingDeliveries = await db.deliveries.toArray();

      const existingProdIds = new Set(existingProducts.map((p) => p.id));
      const existingDelivIds = new Set(existingDeliveries.map((d) => d.id));

      const incomingProducts = products || [];
      const incomingDeliveries = deliveries || [];

      const duplicateProductIds = incomingProducts.filter((p: Product) => existingProdIds.has(p.id)).length;
      const duplicateDeliveryIds = incomingDeliveries.filter((d: Delivery) => existingDelivIds.has(d.id)).length;

      setJsonBackupData({
        version: parsed.version || '1.0',
        products: incomingProducts,
        deliveries: incomingDeliveries,
        settings: parsedSettings,
      });

      setJsonConflictInfo({
        existingProducts: existingProducts.length,
        existingDeliveries: existingDeliveries.length,
        incomingProducts: incomingProducts.length,
        incomingDeliveries: incomingDeliveries.length,
        duplicateProductIds,
        duplicateDeliveryIds,
      });

      setIsJsonModalOpen(true);
    } catch (err) {
      console.error('JSON parse error:', err);
      toast.error('Corrupted File', 'Could not parse the backup file. Please ensure it is valid JSON.');
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  // Perform Merge or Replace restore
  const handleExecuteJsonRestore = async (mode: 'merge' | 'replace') => {
    if (!jsonBackupData) return;
    setIsImporting(true);

    try {
      if (mode === 'replace') {
        // Clear existing tables
        await db.products.clear();
        await db.deliveries.clear();
      }

      // Bulk add or put
      if (jsonBackupData.products && jsonBackupData.products.length > 0) {
        await db.products.bulkPut(jsonBackupData.products);
      }

      if (jsonBackupData.deliveries && jsonBackupData.deliveries.length > 0) {
        await db.deliveries.bulkPut(jsonBackupData.deliveries);
      }

      if (jsonBackupData.settings) {
        await db.settings.put({
          ...jsonBackupData.settings,
          id: 'default',
        });
        await refreshSettings();
      }

      toast.success(
        'Restore Complete',
        mode === 'replace'
          ? 'Database replaced successfully with backup data.'
          : 'Backup data merged with existing local records.'
      );
      setIsJsonModalOpen(false);
      setJsonBackupData(null);
    } catch (err) {
      console.error('Restore execution error:', err);
      toast.error('Restore Failed', 'Failed to write backup records to local database.');
    } finally {
      setIsImporting(false);
    }
  };

  // ==========================================
  // CSV PRODUCT IMPORT
  // ==========================================

  const handleCsvProductsSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: CsvParsedRow[] = [];
        const seenSkusInFile = new Set<string>();

        results.data.forEach((raw: any, index: number) => {
          // Normalize column keys
          const normalized: Record<string, any> = {};
          Object.keys(raw).forEach((k) => {
            normalized[k.trim().toLowerCase()] = raw[k];
          });

          const name =
            normalized['name'] ||
            normalized['product name'] ||
            normalized['product'] ||
            normalized['title'] ||
            '';

          const sku = normalized['sku'] || normalized['product id'] || normalized['id'] || '';
          const category = normalized['category'] || '';
          const description = normalized['description'] || normalized['desc'] || '';

          const rawPrice = normalized['unit price'] || normalized['price'] || normalized['cost'];
          const rawStock = normalized['stock'] || normalized['available stock'] || normalized['qty'];

          const errors: string[] = [];
          if (!name.trim()) {
            errors.push('Missing product name (required)');
          }

          let numPrice: number | undefined;
          if (rawPrice !== undefined && String(rawPrice).trim() !== '') {
            const clean = String(rawPrice).replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(clean);
            if (isNaN(parsed) || parsed < 0) {
              errors.push('Invalid price: must be a positive number');
            } else {
              numPrice = parsed;
            }
          }

          let numStock: number | undefined;
          if (rawStock !== undefined && String(rawStock).trim() !== '') {
            const parsed = parseInt(String(rawStock), 10);
            if (isNaN(parsed) || parsed < 0) {
              errors.push('Invalid stock: must be a positive integer');
            } else {
              numStock = parsed;
            }
          }

          if (sku.trim()) {
            if (seenSkusInFile.has(sku.trim())) {
              errors.push(`Duplicate SKU "${sku.trim()}" found in this file`);
            } else {
              seenSkusInFile.add(sku.trim());
            }
          }

          rows.push({
            index: index + 1,
            name: name.trim(),
            sku: sku.trim() || undefined,
            price: numPrice,
            stock: numStock,
            category: category.trim() || undefined,
            description: description.trim() || undefined,
            isValid: errors.length === 0,
            errors,
          });
        });

        setCsvPreviewRows(rows);
        setIsCsvModalOpen(true);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('CSV Error', `Could not parse CSV: ${error.message}`);
      },
    });

    if (csvProductsInputRef.current) csvProductsInputRef.current.value = '';
  };

  const handleExecuteCsvImport = async () => {
    const validRows = csvPreviewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.warning('No Valid Rows', 'There are no valid product rows to import.');
      return;
    }

    setIsImporting(true);
    try {
      const now = new Date().toISOString();
      const newProducts: Product[] = validRows.map((r) => ({
        id: generateId('prod'),
        name: r.name,
        sku: r.sku,
        price: r.price,
        stock: r.stock,
        category: r.category,
        description: r.description,
        createdAt: now,
        updatedAt: now,
      }));

      await db.products.bulkAdd(newProducts);
      toast.success(
        'Products Imported',
        `Successfully imported ${newProducts.length} products into catalogue.`
      );
      setIsCsvModalOpen(false);
      setCsvPreviewRows([]);
    } catch (err) {
      console.error('Failed to import CSV products:', err);
      toast.error('Import Failed', 'Failed to save imported products to database.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Data Management & Backups</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Export complete system backups, download spreadsheets, or restore data to this device
        </p>
      </div>

      {/* Storage Information Banner */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
          <h3 className="text-sm font-semibold text-slate-900">Your Data Belongs to You (100% Local)</h3>
          <p>
            All products, delivery snapshots, and business settings are stored locally on this device using
            high-performance browser IndexedDB. No external cloud databases, servers, or subscription fees are
            involved.
          </p>
          <p className="text-slate-500 pt-0.5">
            <strong>Important Tip:</strong> Because data lives directly inside this browser profile, clearing your
            browser cache or resetting device data can remove local records. We strongly recommend making
            periodic full backups using the JSON export tool below.
          </p>
        </div>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Full System Backup (JSON) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Full System Backup</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete snapshot of all products, delivery history, buyer records, and business preferences in
                standard JSON format.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportFullJson}
              disabled={isExporting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Complete Backup (JSON)</span>
            </button>

            <label className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Restore Backup File</span>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileSelected}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Card 2: Products Catalogue (CSV) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Products Spreadsheet</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Export and import product catalogue data via CSV. Compatible with Microsoft Excel, Google Sheets,
                and Apple Numbers.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportProductsCsv}
              className="w-full py-2.5 px-4 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Products to CSV</span>
            </button>

            <label className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import Products from CSV</span>
              <input
                ref={csvProductsInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvProductsSelected}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Card 3: Delivery History (CSV) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delivery History Export</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download your full delivery records for accounting, logistics tracking, audit reports, and customer
                volume analytics.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportDeliveriesCsv}
              className="w-full py-2.5 px-4 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Delivery History (CSV)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-normal">
              Includes buyer details, dates, items breakdown, and totals.
            </p>
          </div>
        </div>
      </div>

      {/* JSON Backup Restore Modal */}
      <Modal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        title="Restore Full Database Backup"
        subtitle="Review backup contents and choose restoration method"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {jsonConflictInfo && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                  <span className="text-slate-400 block mb-1">Incoming in Backup</span>
                  <p className="text-sm font-bold text-slate-900">
                    {jsonConflictInfo.incomingProducts} Products
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {jsonConflictInfo.incomingDeliveries} Deliveries
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200/60">
                  <span className="text-slate-400 block mb-1">Currently in Database</span>
                  <p className="text-sm font-bold text-slate-900">
                    {jsonConflictInfo.existingProducts} Products
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {jsonConflictInfo.existingDeliveries} Deliveries
                  </p>
                </div>
              </div>

              {(jsonConflictInfo.duplicateProductIds > 0 || jsonConflictInfo.duplicateDeliveryIds > 0) && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Detected {jsonConflictInfo.duplicateProductIds} products and{' '}
                    {jsonConflictInfo.duplicateDeliveryIds} deliveries with overlapping IDs.
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Choose How to Apply This Backup:
            </p>

            {/* Option A: Merge */}
            <div
              onClick={() => handleExecuteJsonRestore('merge')}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 transition-all cursor-pointer flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Merge With Existing Data (Recommended)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preserves existing products and deliveries. Updates duplicate records and inserts all new ones.
                </p>
              </div>
            </div>

            {/* Option B: Clean Replace */}
            <div
              onClick={() => handleExecuteJsonRestore('replace')}
              className="p-4 rounded-xl border border-rose-200/80 hover:border-rose-500 hover:bg-rose-50/20 transition-all cursor-pointer flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-rose-600 transition-colors">
                  Clean Replace (Overwrite Database)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clears the current local database and restores exact backup state.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsJsonModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV Product Import Preview Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Import Products from CSV"
        subtitle={`Previewing "${csvFileName}" - ${csvPreviewRows.length} rows detected`}
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {/* Summary Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700">
                Total Rows: <strong className="text-slate-900">{csvPreviewRows.length}</strong>
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {csvPreviewRows.filter((r) => r.isValid).length} Valid
              </span>
              {csvPreviewRows.some((r) => !r.isValid) && (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {csvPreviewRows.filter((r) => !r.isValid).length} Issues
                </span>
              )}
            </div>
            <span className="text-slate-400">Only valid rows will be imported</span>
          </div>

          {/* Preview Table */}
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-semibold text-slate-600">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3 w-28">SKU</th>
                  <th className="py-2 px-3 w-24">Category</th>
                  <th className="py-2 px-3 w-20 text-right">Price</th>
                  <th className="py-2 px-3 w-20 text-center">Stock</th>
                  <th className="py-2 px-3">Status / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {csvPreviewRows.map((row) => (
                  <tr
                    key={row.index}
                    className={row.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30 hover:bg-rose-50/50'}
                  >
                    <td className="py-2 px-3 text-center text-slate-400">{row.index}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{row.name || '(Empty)'}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{row.sku || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{row.category || '-'}</td>
                    <td className="py-2 px-3 text-right">
                      {row.price !== undefined ? `${settings.currency}${row.price.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">{row.stock !== undefined ? row.stock : '-'}</td>
                    <td className="py-2 px-3">
                      {row.isValid ? (
                        <span className="text-emerald-600 font-medium">Ready</span>
                      ) : (
                        <span className="text-rose-600 font-medium">{row.errors.join('; ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteCsvImport}
              disabled={isImporting || csvPreviewRows.filter((r) => r.isValid).length === 0}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isImporting && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>
                Import {csvPreviewRows.filter((r) => r.isValid).length} Valid Products
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
