import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Supplier } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, History, ArrowUpRight, Phone, MapPin } from 'lucide-react';

export const SuppliersPage: React.FC<{ onNavigateToPaySupplier?: (supplierId: number) => void }> = ({
  onNavigateToPaySupplier,
}) => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [dataVersion]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsFormOpen(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone || '');
    setAddress(sup.address || '');
    setNotes(sup.notes || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, { name, phone, address, notes });
        showToast('Supplier profile updated');
      } else {
        await api.createSupplier({ name, phone, address, notes });
        showToast('Supplier created successfully');
      }
      setIsFormOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteSupplier(deleteConfirmId);
      showToast('Supplier removed');
      setDeleteConfirmId(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete supplier with transaction history', 'error');
    }
  };

  const openHistory = async (id: number) => {
    try {
      const data = await api.getSupplierHistory(id);
      setHistoryData(data);
    } catch (err: any) {
      showToast('Error loading supplier ledger', 'error');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search suppliers by name or phone..."
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
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading suppliers...' : 'No suppliers registered. Click "Add New Supplier" to create vendors.'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => {
                  const hasDebt = sup.outstanding_balance > 0;
                  return (
                    <tr key={sup.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {sup.name}
                        {sup.notes && (
                          <span className="block text-[11px] text-neutral-400 font-normal">
                            {sup.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {sup.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{sup.phone}</span>
                          </div>
                        )}
                        {sup.address && (
                          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span className="truncate max-w-xs">{sup.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-neutral-900">
                        {formatMoney(sup.total_purchases)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatMoney(sup.total_payments)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                        <span className={hasDebt ? 'text-rose-600' : 'text-neutral-500'}>
                          {formatMoney(sup.outstanding_balance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasDebt && onNavigateToPaySupplier && (
                            <button
                              onClick={() => onNavigateToPaySupplier(sup.id)}
                              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Pay Supplier</span>
                            </button>
                          )}
                          <button
                            onClick={() => openHistory(sup.id)}
                            title="View Purchases & Payment History"
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(sup)}
                            title="Edit Supplier"
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(sup.id)}
                            title="Delete"
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Supplier'}
        subtitle="Maintain vendor records and track accounts payable balances"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Supplier / Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Timber & Hardware Supplies Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+1 (555) 012-7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Office / Warehouse Address
            </label>
            <input
              type="text"
              placeholder="e.g. 100 Industrial Parkway"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Primary timber supplier, net-30 terms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
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
              {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Ledger Modal */}
      {historyData && (
        <Modal
          isOpen={!!historyData}
          onClose={() => setHistoryData(null)}
          title={`Supplier Ledger: ${historyData.supplier.name}`}
          subtitle={`Total Purchases: ${formatMoney(historyData.summary.total_purchases)} · Total Paid: ${formatMoney(historyData.summary.total_payments)} · Balance Payable: ${formatMoney(historyData.summary.outstanding_balance)}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* Purchases */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Purchases</h4>
              {historyData.purchases.length === 0 ? (
                <p className="text-neutral-400 italic">No purchases recorded from this supplier.</p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Purchase #</th>
                        <th className="p-2">Material</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">Paid</th>
                        <th className="p-2 text-right">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyData.purchases.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono">{p.date}</td>
                          <td className="p-2 font-mono font-medium">{p.purchase_number}</td>
                          <td className="p-2">{p.material_name}</td>
                          <td className="p-2 text-right font-mono">{p.quantity} {p.material_unit}</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatMoney(p.total_amount)}</td>
                          <td className="p-2 text-right font-mono text-emerald-700">{formatMoney(p.paid_amount)}</td>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">{formatMoney(p.remaining_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payments */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Payment Disbursements</h4>
              {historyData.payments.length === 0 ? (
                <p className="text-neutral-400 italic">No disbursements made to this supplier yet.</p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-medium">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Voucher #</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Notes</th>
                        <th className="p-2 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyData.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono">{p.date}</td>
                          <td className="p-2 font-mono font-medium">{p.payment_number}</td>
                          <td className="p-2 capitalize">{p.payment_method}</td>
                          <td className="p-2 text-neutral-500">{p.notes || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatMoney(p.amount)}</td>
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
        title="Delete Supplier Profile"
        message="Cannot delete suppliers who have recorded purchase orders or payment history."
        confirmText="Delete Supplier"
      />
    </div>
  );
};
