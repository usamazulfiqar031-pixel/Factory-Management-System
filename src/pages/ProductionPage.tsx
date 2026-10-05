import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Production, Product } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Search, Factory, Layers, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [productions, setProductions] = useState<Production[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState('');
  const [quantityProduced, setQuantityProduced] = useState('10');
  const [notes, setNotes] = useState('');

  // BOM Preview and Actual usage states
  const [bomPreview, setBomPreview] = useState<any[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [canProduce, setCanProduce] = useState(true);
  const [estimatedUnitCost, setEstimatedUnitCost] = useState(0);
  const [totalEstimatedCost, setTotalEstimatedCost] = useState(0);

  // Details Modal
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodBatches, prodList] = await Promise.all([
        api.getProductions(),
        api.getProducts(),
      ]);
      setProductions(prodBatches);
      const activeProds = prodList.filter((p) => p.is_active === 1);
      setProducts(activeProds);
      if (activeProds.length > 0 && !productId) {
        setProductId(String(activeProds[0].id));
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading productions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  // Whenever product or quantity changes in modal, fetch BOM calculation
  useEffect(() => {
    if (!isModalOpen || !productId) return;
    const fetchBomPreview = async () => {
      setBomLoading(true);
      try {
        const preview = await api.previewBom(Number(productId), Number(quantityProduced) || 1);
        setBomPreview(preview.materials || []);
        setCanProduce(preview.can_produce);
        setEstimatedUnitCost(preview.estimated_unit_cost || 0);
        setTotalEstimatedCost(preview.total_estimated_cost || 0);
      } catch (err) {
        setBomPreview([]);
      } finally {
        setBomLoading(false);
      }
    };
    fetchBomPreview();
  }, [isModalOpen, productId, quantityProduced]);

  const handleActualQtyChange = (index: number, newQty: string) => {
    const updated = [...bomPreview];
    const val = Number(newQty) || 0;
    updated[index].actual_quantity = val;
    // Check if new actual quantity exceeds current stock
    updated[index].has_enough = updated[index].current_stock >= val;
    setBomPreview(updated);
    setCanProduce(updated.every((item) => item.has_enough));

    // Recalculate estimated total
    const totalCost = updated.reduce(
      (sum, item) => sum + item.actual_quantity * item.purchase_price,
      0
    );
    setTotalEstimatedCost(totalCost);
    const qty = Number(quantityProduced) || 1;
    setEstimatedUnitCost(qty > 0 ? Number((totalCost / qty).toFixed(2)) : 0);
  };

  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    if (products.length > 0) setProductId(String(products[0].id));
    setQuantityProduced('10');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProduce) {
      showToast('Cannot produce: Insufficient stock for one or more raw materials', 'error');
      return;
    }

    setSaving(true);
    try {
      const materialsUsedPayload = bomPreview.map((item) => ({
        material_id: item.material_id,
        expected_quantity: item.expected_quantity,
        actual_quantity: Number(item.actual_quantity),
      }));

      await api.createProduction({
        date,
        product_id: Number(productId),
        quantity_produced: Number(quantityProduced),
        materials_used: materialsUsedPayload,
        notes,
      });

      showToast('Production run recorded successfully! Raw materials deducted, finished goods increased.');
      setIsModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to record production batch', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProductions = productions.filter(
    (pr) =>
      pr.production_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search production batches by # or product name..."
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
          <span>New Production Run</span>
        </button>
      </div>

      {/* Production Batches Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Batch # & Date</th>
                <th className="py-3 px-4">Finished Product</th>
                <th className="py-3 px-4 text-right">Quantity Produced</th>
                <th className="py-3 px-4 text-right">Raw Material Cost</th>
                <th className="py-3 px-4 text-right">Cost Per Unit</th>
                <th className="py-3 px-4">Materials Consumed</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredProductions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading production logs...' : 'No production runs recorded. Click "New Production Run" to transform raw materials into products.'}
                  </td>
                </tr>
              ) : (
                filteredProductions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-neutral-900">{pr.production_number}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{pr.date}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {pr.product_name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900">
                      +{pr.quantity_produced} <span className="font-normal text-neutral-500">units</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-neutral-900">
                      {formatMoney(pr.total_material_cost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatMoney(pr.unit_cost)}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        {pr.items?.map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded"
                          >
                            {item.material_name}: {item.actual_quantity} {item.material_unit}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-medium text-emerald-700">Completed</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedProduction(pr)}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors inline-flex items-center gap-0.5"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Production Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Execute Production Run"
        subtitle="Calculates required raw materials from BOM. Adjust actual quantities consumed before confirming."
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Production Date *
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
                Finished Product *
              </label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Batch Quantity to Produce *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* BOM USAGE & ADJUSTMENT TABLE */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-100/60 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-900 block">
                  Material Usage & Inventory Deductions
                </span>
                <span className="text-[11px] text-neutral-500">
                  Expected qty is computed from BOM. You may edit the actual quantity consumed if scrap/loss occurred.
                </span>
              </div>
              {canProduce ? (
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sufficient Stock</span>
                </span>
              ) : (
                <span className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Insufficient Stock</span>
                </span>
              )}
            </div>

            <div className="p-3">
              {bomLoading ? (
                <div className="py-6 text-center text-xs text-neutral-400">
                  Calculating BOM requirements...
                </div>
              ) : bomPreview.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  This product has no Bill of Materials (BOM) configured yet. Please configure its BOM in Finished Products.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-neutral-500 border-b border-neutral-100 font-medium">
                    <tr>
                      <th className="py-2">Raw Material</th>
                      <th className="py-2 text-right">Available In Stock</th>
                      <th className="py-2 text-right">BOM Expected</th>
                      <th className="py-2 text-right">Actual Consumed *</th>
                      <th className="py-2 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {bomPreview.map((item, idx) => (
                      <tr key={item.material_id} className={!item.has_enough ? 'bg-rose-50/60' : ''}>
                        <td className="py-2.5 font-medium text-neutral-900">
                          {item.material_name}
                          {!item.has_enough && (
                            <span className="block text-[10px] text-rose-600 font-semibold">
                              Shortage: {item.shortage} {item.material_unit}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-neutral-600">
                          {item.current_stock} {item.material_unit}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-neutral-500">
                          {item.expected_quantity} {item.material_unit}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.actual_quantity}
                              onChange={(e) => handleActualQtyChange(idx, e.target.value)}
                              className="w-24 px-2 py-1 border border-neutral-300 rounded text-xs font-mono font-bold text-right focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                            <span className="text-neutral-500 text-[11px] w-8">
                              {item.material_unit}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-medium text-neutral-900">
                          {formatMoney(item.actual_quantity * item.purchase_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Total Cost Summary */}
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-xs">
              <span className="text-neutral-600">
                Calculated Production Unit Cost: <strong className="font-mono text-neutral-900">{formatMoney(estimatedUnitCost)}</strong>
              </span>
              <span className="font-medium text-neutral-900">
                Total Material Cost: <strong className="font-mono text-sm font-bold text-neutral-900">{formatMoney(totalEstimatedCost)}</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Production Batch Notes / Machine Shift
            </label>
            <input
              type="text"
              placeholder="e.g. Shift A, Line 2 run, 0% scrap"
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
              disabled={saving || !canProduce || bomPreview.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Processing Batch...' : 'Confirm Production Run'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Batch Details Modal */}
      {selectedProduction && (
        <Modal
          isOpen={!!selectedProduction}
          onClose={() => setSelectedProduction(null)}
          title={`Batch Details: ${selectedProduction.production_number}`}
          subtitle={`Manufactured: ${selectedProduction.quantity_produced} units of ${selectedProduction.product_name} on ${selectedProduction.date}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <span className="text-neutral-500 block">Total Material Cost</span>
                <span className="font-mono text-sm font-bold text-neutral-900">
                  {formatMoney(selectedProduction.total_material_cost)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Calculated Cost Per Unit</span>
                <span className="font-mono text-sm font-bold text-neutral-900">
                  {formatMoney(selectedProduction.unit_cost)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Raw Materials Consumed in Batch</h4>
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-100 text-neutral-600">
                    <tr>
                      <th className="p-2">Material</th>
                      <th className="p-2 text-right">Expected Qty</th>
                      <th className="p-2 text-right">Actual Used</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedProduction.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-medium">{item.material_name}</td>
                        <td className="p-2 text-right font-mono text-neutral-500">
                          {item.expected_quantity} {item.material_unit}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-neutral-900">
                          {item.actual_quantity} {item.material_unit}
                        </td>
                        <td className="p-2 text-right font-mono">{formatMoney(item.unit_cost)}</td>
                        <td className="p-2 text-right font-mono font-medium">{formatMoney(item.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedProduction.notes && (
              <div className="p-2.5 bg-neutral-50 rounded border border-neutral-200 text-neutral-600 italic">
                Note: {selectedProduction.notes}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
