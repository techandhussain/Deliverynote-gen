import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  FileText,
  Hash,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { db, DEFAULT_SETTINGS } from '../../db/db';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const toast = useToast();

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [logo, setLogo] = useState(settings.logo || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [currency, setCurrency] = useState(settings.currency || '$');
  const [dateFormat, setDateFormat] = useState(settings.dateFormat || 'YYYY-MM-DD');
  const [themePreference, setThemePreference] = useState(settings.themePreference || 'light');
  const [defaultFooterNotes, setDefaultFooterNotes] = useState(settings.defaultFooterNotes || '');
  const [inventoryTracking, setInventoryTracking] = useState(settings.inventoryTracking);
  const [nextDeliverySequence, setNextDeliverySequence] = useState<number>(settings.nextDeliverySequence || 1001);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setBusinessName(settings.businessName);
    setLogo(settings.logo || '');
    setAddress(settings.address || '');
    setPhone(settings.phone || '');
    setCurrency(settings.currency || '$');
    setDateFormat(settings.dateFormat || 'YYYY-MM-DD');
    setThemePreference(settings.themePreference || 'light');
    setDefaultFooterNotes(settings.defaultFooterNotes || '');
    setInventoryTracking(settings.inventoryTracking);
    setNextDeliverySequence(settings.nextDeliverySequence || 1001);
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('File Size Exceeded', 'Please upload a logo image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      toast.info('Logo Selected', 'Logo preview updated. Remember to save changes.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!businessName.trim()) {
      toast.warning('Validation', 'Business Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        businessName: businessName.trim(),
        logo: logo || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        currency: currency.trim() || '$',
        dateFormat,
        themePreference,
        defaultFooterNotes: defaultFooterNotes.trim(),
        inventoryTracking,
        nextDeliverySequence: Math.max(1, Number(nextDeliverySequence) || 1001),
      });

      toast.success('Settings Saved', 'Business preferences updated successfully.');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Save Failed', 'Could not save business settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await db.products.clear();
      await db.deliveries.clear();
      await db.settings.put(DEFAULT_SETTINGS);
      await refreshSettings();
      toast.success('Database Cleared', 'All local records were reset to factory defaults.');
      setIsResetDialogOpen(false);
    } catch (err) {
      console.error('Reset failed:', err);
      toast.error('Reset Failed', 'Could not clear database.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* View Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize company profile, document branding, currency, and inventory behavior
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Business Identity & Branding */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Company Identity & Document Header
          </h3>

          <div className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Business Logo
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                {logo ? (
                  <div className="relative w-24 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1 group">
                    <img src={logo} alt="Business logo" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                      title="Remove logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400">
                    <Building2 className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload Logo Image</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    PNG, JPG, or SVG with transparent background recommended. Appears on printed delivery notes.
                  </p>
                </div>
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Business / Trader Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Hardware Supplies"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business Address / Headquarters
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Commercial Way, Suite 400"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Inventory Tracking Behavior */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              Inventory Stock Tracking
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inventoryTracking}
                onChange={(e) => setInventoryTracking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {inventoryTracking ? (
              <span className="text-emerald-700 font-medium">
                Active: Available product stock is automatically deducted upon marking a delivery as
                &quot;Delivered&quot;. Pending/In-Transit orders do not reduce stock. Cancelling a delivered order
                automatically restores product stock safely.
              </span>
            ) : (
              <span className="text-slate-500">
                Disabled: Deliveries can be created without inventory stock limits or quantity deductions.
              </span>
            )}
          </p>
        </div>

        {/* Card 3: Formats, Currency & Delivery Note Options */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Localization & Document Formats
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Currency Symbol */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Currency Symbol / Code
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="$"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              />
            </div>

            {/* Date Format */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-23)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (23/11/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (11/23/2026)</option>
                <option value="MMM D, YYYY">MMM D, YYYY (Nov 23, 2026)</option>
              </select>
            </div>

            {/* Next Sequence Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Next Delivery Note #
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={nextDeliverySequence}
                  onChange={(e) => setNextDeliverySequence(parseInt(e.target.value, 10) || 1001)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Default Delivery Note Footer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Default Delivery Note Footer Terms / Thank You Message
            </label>
            <textarea
              rows={2}
              value={defaultFooterNotes}
              onChange={(e) => setDefaultFooterNotes(e.target.value)}
              placeholder="e.g. Goods received in good condition and order. Thank you for your business!"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-6 mt-10 space-y-3">
        <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Danger Zone: Reset Local Application Database</span>
        </div>
        <p className="text-xs text-rose-700/80 leading-relaxed max-w-2xl">
          Permanently delete all stored products, customer delivery records, and reset settings back to default.
          This operation cannot be undone. We advise downloading a JSON backup prior to resetting.
        </p>
        <button
          type="button"
          onClick={() => setIsResetDialogOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 hover:bg-rose-100/60 rounded-xl transition-colors shadow-xs"
        >
          Reset Application Database
        </button>
      </div>

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset Entire Database"
        message="Are you completely sure you want to delete all local products and delivery records? All data stored in this browser profile will be permanently erased."
        confirmLabel="Yes, Reset Database"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
};
