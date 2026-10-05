import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { CustomerPayment, Customer } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Search, ArrowDownLeft, Wallet, Building, CheckCircle2 } from 'lucide-react';

export const CustomerPaymentsPage: React.FC<{ preselectedCustomerId?: number | null }> = ({
  preselectedCustomerId,
}) => {
  const { formatMoney, showToast, dataVersion, triggerRefresh } = useFactory();
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('bank');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [payList, custList] = await Promise.all([
        api.getCustomerPayments(),
        api.getCustomers(),
      ]);
      setPayments(payList);
      setCustomers(custList);

      if (preselectedCustomerId) {
        setCustomerId(String(preselectedCustomerId));
        setIsModalOpen(true);
      } else if (custList.length > 0 && !customerId) {
        setCustomerId(String(custList[0].id));
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading customer receipts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, preselectedCustomerId]);

  const selectedCustomerObj = customers.find((c) => c.id === Number(customerId));
  const customerDebt = selectedCustomerObj?.outstanding_balance || 0;

  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    if (customers.length > 0) setCustomerId(String(customers[0].id));
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
      const res = await api.createCustomerPayment({
        date,
        customer_id: Number(customerId),
        amount: val,
        payment_method: paymentMethod,
        notes,
      });

      showToast(`Payment of ${formatMoney(val)} received! Cash/Bank increased. New outstanding: ${formatMoney(res.new_outstanding)}`);
      setIsModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search receipts by receipt # or customer name..."
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
          <span>Receive Customer Payment</span>
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt # & Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Method / Destination</th>
                <th className="py-3 px-4">Invoice Reference / Notes</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {loading ? 'Loading payment records...' : 'No payments found. Click "Receive Customer Payment" to log balance collections.'}
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
                      {p.customer_name}
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
                      {p.invoice_number ? `Invoice ${p.invoice_number} · ` : ''}
                      {p.notes || 'Balance payment'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      +{formatMoney(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Collected</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Receive Customer Payment"
        subtitle="Credits customer account balance and deposits funds into Cash or Bank"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Receipt Date *
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
                Customer *
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Due: {formatMoney(c.outstanding_balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current balance card */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center text-xs">
            <span className="text-neutral-500">Current Outstanding Balance:</span>
            <span className="font-mono font-bold text-neutral-900 text-sm">
              {formatMoney(customerDebt)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Amount Received *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="30000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              {customerDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(customerDebt))}
                  className="text-[10px] text-neutral-600 underline mt-1 hover:text-neutral-900 block"
                >
                  Pay full balance ({formatMoney(customerDebt)})
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Deposit Into *
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
              Payment Reference / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Bank transfer ref #TX9910, Cash deposit"
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
              {saving ? 'Recording...' : 'Record Payment Receipt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
