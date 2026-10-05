import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Purchase, Supplier, Material } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Search, Filter, Ban, CheckCircle } from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unitPrice, setUnitPrice] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'credit'>('bank');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [purData, supData, matData] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getMaterials(),
      ]);
      setPurchases(purData);
      setSuppliers(supData);
      setMaterials(matData.filter((m) => m.is_active === 1));

      if (supData.length > 0 && !supplierId) setSupplierId(String(supData[0].id));
      if (matData.length > 0 && !materialId) {
        setMaterialId(String(matData[0].id));
        setUnitPrice(String(matData[0].purchase_price || 0));
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading purchases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  // When material selection changes in modal, auto-fill standard purchase price
  const handleMaterialChange = (newMatId: string) => {
    setMaterialId(newMatId);
    const found = materials.find((m) => m.id === Number(newMatId));
    if (found) {
      setUnitPrice(String(found.purchase_price || 0));
    }
  };

  const calculatedTotal = Number(((Number(quantity) || 0) * (Number(unitPrice) || 0)).toFixed(2));
  const calculatedRemaining = Number(Math.max(0, calculatedTotal - (Number(paidAmount) || 0)).toFixed(2));

  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    if (suppliers.length > 0) setSupplierId(String(suppliers[0].id));
    if (materials.length > 0) {
      setMaterialId(String(materials[0].id));
      setUnitPrice(String(materials[0].purchase_price || 0));
    }
    setQuantity('100');
    setPaidAmount('0');
    setPaymentMethod('bank');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createPurchase({
        date,
        supplier_id: Number(supplierId),
        material_id: Number(materialId),
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod,
        notes,
      });

      showToast('Purchase recorded successfully. Stock and ledger updated.');
      setIsModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to record purchase', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPurchase = async () => {
    if (!cancelConfirmId) return;
    try {
      await api.cancelPurchase(cancelConfirmId);
      showToast('Purchase cancelled. Inventory and cash balances reversed.');
      setCancelConfirmId(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Cannot cancel purchase', 'error');
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchSearch =
      p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSupplier = selectedSupplierFilter
      ? String(p.supplier_id) === selectedSupplierFilter
      : true;
    return matchSearch && matchSupplier;
  });

  const selectedMaterialObj = materials.find((m) => m.id === Number(materialId));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search purchases by #, supplier, or material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase</span>
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Date & Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Material Purchased</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading purchases...' : 'No purchases found. Click "New Purchase" to record inbound raw materials.'}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => {
                  const isCancelled = pur.status === 'cancelled';
                  return (
                    <tr
                      key={pur.id}
                      className={`hover:bg-neutral-50/50 transition-colors ${
                        isCancelled ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-neutral-900">{pur.purchase_number}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{pur.date}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-900">
                        {pur.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-neutral-800">
                        <span className="font-medium text-neutral-900">{pur.material_name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900">
                        {pur.quantity.toLocaleString()} {pur.material_unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {formatMoney(pur.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900">
                        {formatMoney(pur.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatMoney(pur.paid_amount)}
                        <span className="block text-[10px] text-neutral-400 capitalize">
                          {pur.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        <span className={pur.remaining_amount > 0 ? 'text-rose-600' : 'text-neutral-500'}>
                          {formatMoney(pur.remaining_amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-medium ${
                            isCancelled
                              ? 'text-neutral-400'
                              : pur.remaining_amount <= 0
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {isCancelled
                            ? 'Cancelled'
                            : pur.remaining_amount <= 0
                            ? 'Paid'
                            : 'Partial'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isCancelled && (
                          <button
                            onClick={() => setCancelConfirmId(pur.id)}
                            title="Cancel Purchase & Reverse Inventory"
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Raw Material Purchase"
        subtitle="Increases raw material stock, updates supplier balance, and records payment"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Supplier *
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Material *
              </label>
              <select
                required
                value={materialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Quantity ({selectedMaterialObj?.unit || 'unit'}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Unit Price *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Dynamic Calculation Summary Card */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Total Purchase Value:</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {formatMoney(calculatedTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Amount Paid Now
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={calculatedTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="credit">Credit / Pay Later</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
              <span className="font-medium text-neutral-700">Remaining Balance (Added to Supplier Debt):</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {formatMoney(calculatedRemaining)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Optional Notes / Purchase Order Reference
            </label>
            <input
              type="text"
              placeholder="e.g. Batch #401, Delivered by supplier freight"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Processing Purchase...' : 'Confirm & Save Purchase'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel confirmation */}
      <ConfirmDialog
        isOpen={!!cancelConfirmId}
        onClose={() => setCancelConfirmId(null)}
        onConfirm={handleCancelPurchase}
        title="Cancel Purchase Record"
        message="This action will decrease raw material stock by the purchased quantity and reverse any recorded cash/bank payments."
        confirmText="Cancel Purchase"
      />
    </div>
  );
};
