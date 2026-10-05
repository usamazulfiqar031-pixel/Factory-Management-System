import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { SupplierPayment, Supplier } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Search, ArrowUpRight, Wallet, Building, CheckCircle2 } from 'lucide-react';

export const SupplierPaymentsPage: React.FC<{ preselectedSupplierId?: number | null }> = ({
  preselectedSupplierId,
}) => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('bank');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [payList, supList] = await Promise.all([
        api.getSupplierPayments(),
        api.getSuppliers(),
      ]);
      setPayments(payList);
      setSuppliers(supList);

      if (preselectedSupplierId) {
        setSupplierId(String(preselectedSupplierId));
        setIsModalOpen(true);
      } else if (supList.length > 0 && !supplierId) {
        setSupplierId(String(supList[0].id));
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading supplier payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, preselectedSupplierId]);

  const selectedSupplierObj = suppliers.find((s) => s.id === Number(supplierId));
  const supplierDebt = selectedSupplierObj?.outstanding_balance || 0;

  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    if (suppliers.length > 0) setSupplierId(String(suppliers[0].id));
    setAmount('');
    setPaymentMethod('bank');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (val <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.createSupplierPayment({
        date,
        supplier_id: Number(supplierId),
        amount: val,
        payment_method: paymentMethod,
        notes,
      });

      showToast(`Disbursement of ${formatMoney(val)} recorded! Cash/Bank reduced. Remaining debt: ${formatMoney(res.new_outstanding)}`);
      setIsModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to record supplier payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search payments by voucher # or supplier name..."
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
          <span>Pay Supplier</span>
        </button>
      </div>

      {/* Supplier Payments Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Voucher # & Date</th>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Disbursed From</th>
                <th className="py-3 px-4">Purchase Ref / Notes</th>
                <th className="py-3 px-4 text-right">Amount Disbursed</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading payment records...' : 'No supplier payments logged. Click "Pay Supplier" to record disbursements.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-neutral-900">{p.payment_number}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{p.date}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {p.supplier_name}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-medium">
                        {p.payment_method === 'cash' ? (
                          <Wallet className="w-3 h-3 text-neutral-500" />
                        ) : (
                          <Building className="w-3 h-3 text-neutral-500" />
                        )}
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {p.purchase_number ? `Purchase ${p.purchase_number} · ` : ''}
                      {p.notes || 'Accounts payable settlement'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 text-sm">
                      -{formatMoney(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Disbursed</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Disburse Supplier Payment"
        subtitle="Reduces supplier debt and deducts disbursed amount from Cash or Bank"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Payment Date *
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
                    {s.name} (Debt: {formatMoney(s.outstanding_balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current balance card */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center text-xs">
            <span className="text-neutral-500">Current Outstanding Payable:</span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              {formatMoney(supplierDebt)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Amount to Disburse *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="40000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              {supplierDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(supplierDebt))}
                  className="text-[10px] text-neutral-600 underline mt-1 hover:text-neutral-900 block"
                >
                  Pay full debt ({formatMoney(supplierDebt)})
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Disburse From *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="bank">Bank Account</option>
                <option value="cash">Cash in Hand</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Payment Voucher Notes / Cheque #
            </label>
            <input
              type="text"
              placeholder="e.g. Wire transfer ref #WR891, Cheque #4928"
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
              {saving ? 'Disbursing...' : 'Disburse Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
