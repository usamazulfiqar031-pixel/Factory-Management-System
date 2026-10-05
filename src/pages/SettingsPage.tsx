import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { useAuth } from '../context/AuthContext';
import { Save, Sparkles, Lock, Building, DollarSign, Database, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings, showToast, triggerRefresh } = useFactory();
  const { user } = useAuth();

  // Form states
  const [factoryName, setFactoryName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('PKR');
  const [initialCash, setInitialCash] = useState('0');
  const [initialBank, setInitialBank] = useState('0');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setFactoryName(settings.factory_name || '');
      setPhone(settings.phone || '');
      setAddress(settings.address || '');
      setCurrencySymbol(settings.currency_symbol || 'PKR');
      setInitialCash(String(settings.initial_cash || 0));
      setInitialBank(String(settings.initial_bank || 0));
      setAllowNegativeStock(settings.allow_negative_stock === 1);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings({
        factory_name: factoryName,
        phone,
        address,
        currency_symbol: currencySymbol,
        initial_cash: Number(initialCash),
        initial_bank: Number(initialBank),
        allow_negative_stock: allowNegativeStock,
      });
      await refreshSettings();
      showToast('Factory configuration saved successfully');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSeedDemo = async () => {
    if (
      !window.confirm(
        'Load the sample manufacturing factory dataset? This sets up demo raw materials (Wood, Paint, Screws), Dining Tables with BOM, suppliers, customers, purchases, production runs, and sales.'
      )
    ) {
      return;
    }

    setSeeding(true);
    try {
      await api.seedDemo();
      await refreshSettings();
      showToast('Demo factory scenario loaded successfully!');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to load demo scenario', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      showToast('Manager password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl">
      {/* 1. Factory Profile & Financial Initial Balances */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <Building className="w-5 h-5 text-neutral-900" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Factory Identity & Financial Balances</h2>
            <p className="text-xs text-neutral-500">Configure company metadata for invoices and opening vault funds</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Factory Legal / Trade Name *
              </label>
              <input
                type="text"
                required
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Official Phone / Contact
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Physical Plant Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={() => setCurrencySymbol('PKR')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="PKR"
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Opening Cash in Hand
              </label>
              <input
                type="number"
                step="any"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Opening Bank Balance
              </label>
              <input
                type="number"
                step="any"
                value={initialBank}
                onChange={(e) => setInitialBank(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="rounded text-neutral-900 focus:ring-neutral-900"
              />
              <span>
                Allow negative inventory (unrestricted selling beyond on-hand quantity). By default, negative stock is strictly prevented.
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Demo Dataset Setup */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-neutral-900" />
            <h2 className="text-sm font-semibold text-neutral-900">Sample Manufacturing Factory Dataset</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-lg leading-relaxed">
            Quickly seed a realistic furniture manufacturing dataset (Timber, Paint, Screws, Tables, Chairs, BOM formulas, suppliers, and customer transactions) matching the project brief.
          </p>
        </div>

        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{seeding ? 'Seeding Dataset...' : 'Load Factory Demo Data'}</span>
        </button>
      </div>

      {/* 3. Security: Password Change */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <Lock className="w-5 h-5 text-neutral-900" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Manager Security & Access</h2>
            <p className="text-xs text-neutral-500">Update administrative password for user "{user?.username}"</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword}
            className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {updatingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
