import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Material } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Search, AlertCircle, Edit, Trash2, History } from 'lucide-react';

export const RawMaterialsPage: React.FC = () => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [historyMaterialId, setHistoryMaterialId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [initialQuantity, setInitialQuantity] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await api.getMaterials();
      setMaterials(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading materials', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [dataVersion]);

  const openCreateModal = () => {
    setEditingMaterial(null);
    setName('');
    setUnit('kg');
    setPurchasePrice('0');
    setMinStockLevel('10');
    setInitialQuantity('0');
    setIsActive(true);
    setIsFormOpen(true);
  };

  const openEditModal = (mat: Material) => {
    setEditingMaterial(mat);
    setName(mat.name);
    setUnit(mat.unit);
    setPurchasePrice(String(mat.purchase_price));
    setMinStockLevel(String(mat.min_stock_level));
    setIsActive(mat.is_active === 1);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingMaterial) {
        await api.updateMaterial(editingMaterial.id, {
          name,
          unit,
          purchase_price: Number(purchasePrice),
          min_stock_level: Number(minStockLevel),
          is_active: isActive,
        });
        showToast('Raw material updated successfully');
      } else {
        await api.createMaterial({
          name,
          unit,
          purchase_price: Number(purchasePrice),
          min_stock_level: Number(minStockLevel),
          initial_quantity: Number(initialQuantity),
        });
        showToast('Raw material created successfully');
      }
      setIsFormOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save material', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteMaterial(deleteConfirmId);
      showToast('Material removed or deactivated');
      setDeleteConfirmId(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete material', 'error');
    }
  };

  const openHistory = async (id: number) => {
    try {
      const data = await api.getMaterial(id);
      setHistoryData(data);
      setHistoryMaterialId(id);
    } catch (err: any) {
      showToast('Error loading material history', 'error');
    }
  };

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search materials (e.g. Wood, Paint, Screws)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Raw Material</span>
        </button>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Material Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Standard Price</th>
                <th className="py-3 px-4 text-right">Stock Valuation</th>
                <th className="py-3 px-4 text-right">Min Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading materials...' : 'No raw materials found. Click "Add Raw Material" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      <div className="flex items-center gap-2">
                        {mat.is_low_stock && (
                          <span title="Stock is below minimum safe level">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          </span>
                        )}
                        <span>{mat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-600">
                      {mat.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                      <span className={mat.is_low_stock ? 'text-amber-700' : 'text-neutral-900'}>
                        {mat.quantity.toLocaleString()} {mat.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatMoney(mat.purchase_price)} / {mat.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-neutral-900">
                      {formatMoney(mat.stock_value)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-500">
                      {mat.min_stock_level} {mat.unit}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-medium ${
                          mat.is_active ? 'text-emerald-700' : 'text-neutral-400'
                        }`}
                      >
                        {mat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openHistory(mat.id)}
                          title="View Inbound & Production History"
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(mat)}
                          title="Edit Material"
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(mat.id)}
                          title="Delete / Deactivate"
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Material Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingMaterial ? `Edit Material: ${editingMaterial.name}` : 'New Raw Material'}
        subtitle="Raw materials are replenished via Purchases and consumed in Production"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Material Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wood, Steel Rods, Paint, Screws"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Unit of Measure *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="kg">kg (Kilogram)</option>
                <option value="liter">liter (L)</option>
                <option value="piece">piece (Pcs)</option>
                <option value="meter">meter (m)</option>
                <option value="box">box</option>
                <option value="sqm">sqm (Square Meter)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Standard Unit Price *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Minimum Stock Alert Level
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {!editingMaterial ? (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Initial Opening Stock
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="isActive" className="text-xs text-neutral-700 cursor-pointer">
                  Material is Active
                </label>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingMaterial ? 'Update Material' : 'Save Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      {historyData && (
        <Modal
          isOpen={!!historyMaterialId}
          onClose={() => {
            setHistoryMaterialId(null);
            setHistoryData(null);
          }}
          title={`Inventory Audit: ${historyData.name}`}
          subtitle={`Current stock: ${historyData.quantity} ${historyData.unit} · Standard Price: ${formatMoney(historyData.purchase_price)}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Inbound Purchases (Increments Stock)</h4>
              {historyData.purchases.length === 0 ? (
                <p className="text-neutral-400 italic">No purchase history recorded for this material.</p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Purchase #</th>
                        <th className="p-2">Supplier</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyData.purchases.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono">{p.date}</td>
                          <td className="p-2 font-mono font-medium">{p.purchase_number}</td>
                          <td className="p-2">{p.supplier_name}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">
                            +{p.quantity} {historyData.unit}
                          </td>
                          <td className="p-2 text-right font-mono">{formatMoney(p.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Production Usage (Decrements Stock)</h4>
              {historyData.usages.length === 0 ? (
                <p className="text-neutral-400 italic">No production consumption recorded for this material.</p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Production #</th>
                        <th className="p-2">Finished Product</th>
                        <th className="p-2 text-right">Consumed</th>
                        <th className="p-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyData.usages.map((u: any) => (
                        <tr key={u.id}>
                          <td className="p-2 font-mono">{u.date}</td>
                          <td className="p-2 font-mono font-medium">{u.production_number}</td>
                          <td className="p-2">{u.product_name}</td>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">
                            -{u.actual_quantity} {historyData.unit}
                          </td>
                          <td className="p-2 text-right font-mono">{formatMoney(u.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Remove or Deactivate Material"
        message="If this material has been used in purchases or production runs, it will be safely deactivated to preserve accounting records."
        confirmText="Confirm"
      />
    </div>
  );
};
