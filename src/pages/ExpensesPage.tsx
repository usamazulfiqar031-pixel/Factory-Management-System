import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useFactory } from '../context/FactoryContext';
import { Expense } from '../types';
import { Modal } from '../components/Modal';
import {
  Plus,
  Search,
  Wallet,
  Building,
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const {
    formatMoney,
    showToast,
    dataVersion,
    triggerRefresh,
  } = useFactory();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('');

  // Load expenses
  const loadExpenses = async () => {
    setLoading(true);

    try {
      const data = await api.getExpenses({
        method: selectedMethod || undefined,
      });

      setExpenses(data);
    } catch (err: any) {
      showToast(
        err.message || 'Error loading expenses',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [dataVersion, selectedMethod]);

  // Open create expense modal
  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setPurpose('');
    setPaymentMethod('cash');
    setNotes('');
    setIsModalOpen(true);
  };

  // Save new expense
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const val = Number(amount);

    if (val <= 0) {
      showToast(
        'Expense amount must be greater than zero',
        'error'
      );
      return;
    }

    if (!purpose.trim()) {
      showToast(
        'Please specify what the expense was used for',
        'error'
      );
      return;
    }

    setSaving(true);

    try {
      await api.createExpense({
        date,
        amount: val,
        purpose: purpose.trim(),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      });

      showToast(
        'Expense recorded successfully! Cash/Bank balance reduced.'
      );

      setIsModalOpen(false);

      triggerRefresh();
    } catch (err: any) {
      showToast(
        err.message || 'Failed to record expense',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Search expenses
  const filteredExpenses = expenses.filter((e) => {
    const search = searchTerm.toLowerCase();

    return (
      e.purpose.toLowerCase().includes(search) ||
      (e.notes &&
        e.notes.toLowerCase().includes(search))
    );
  });

  // Total filtered expense amount
  const totalExpenseSum = filteredExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex flex-1 items-center gap-3 max-w-lg">

          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />

            <input
              type="text"
              placeholder="Search expenses (e.g. Transport, Electricity, Repairs)..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={selectedMethod}
            onChange={(e) =>
              setSelectedMethod(e.target.value)
            }
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">
              All Payment Methods
            </option>

            <option value="cash">
              Cash Only
            </option>

            <option value="bank">
              Bank Only
            </option>
          </select>
        </div>

        {/* Add Expense */}
        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />

          <span>
            Record Expense
          </span>
        </button>
      </div>

      {/* Summary Banner */}
      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">

        <div>
          <span className="text-neutral-500 font-medium">
            Filtered Operating Expenses:
          </span>

          <div className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
            {formatMoney(totalExpenseSum)}
          </div>
        </div>

        <p className="text-neutral-500 max-w-md">
          Direct operational expenses reduce cash or bank
          liquidity and are deducted in net profit calculations.
        </p>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase font-semibold">

              <tr>
                <th className="py-3 px-4">
                  Date
                </th>

                <th className="py-3 px-4">
                  Purpose / Used For
                </th>

                <th className="py-3 px-4">
                  Payment Method
                </th>

                <th className="py-3 px-4">
                  Notes
                </th>

                <th className="py-3 px-4 text-right">
                  Amount
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-neutral-100 text-neutral-700">

              {filteredExpenses.length === 0 ? (

                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-neutral-400"
                  >
                    {loading
                      ? 'Loading expenses...'
                      : 'No expenses recorded. Click "Record Expense" to log operating costs.'}
                  </td>
                </tr>

              ) : (

                filteredExpenses.map((exp) => (

                  <tr
                    key={exp.id}
                    className="hover:bg-neutral-50/50 transition-colors"
                  >

                    {/* Date */}
                    <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                      {exp.date}
                    </td>

                    {/* Purpose */}
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {exp.purpose}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-4 capitalize">

                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-medium">

                        {exp.payment_method === 'cash' ? (
                          <Wallet className="w-3 h-3 text-neutral-500" />
                        ) : (
                          <Building className="w-3 h-3 text-neutral-500" />
                        )}

                        {exp.payment_method}

                      </span>

                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-neutral-500">
                      {exp.notes || '-'}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 text-sm">
                      {formatMoney(exp.amount)}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Operating Expense"
        subtitle="Quick entry for factory operating expenses (Transport, Electricity, Repairs, Maintenance)"
        maxWidth="md"
      >

        <form
          onSubmit={handleSave}
          className="space-y-4"
        >

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Date *
              </label>

              <input
                type="date"
                required
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

            </div>

            <div>

              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Amount *
              </label>

              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="5000"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

            </div>

          </div>

          {/* Purpose */}
          <div>

            <label className="block text-xs font-medium text-neutral-700 mb-1">
              What it was used for *
            </label>

            <input
              type="text"
              required
              placeholder="e.g. Transport, Electricity, Machine repair, Factory tea/water"
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value)
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">

              {[
                'Transport',
                'Electricity Bill',
                'Machine Repair',
                'Generator Fuel',
                'Factory Supplies',
                'Packaging',
              ].map((sug) => (

                <button
                  key={sug}
                  type="button"
                  onClick={() => setPurpose(sug)}
                  className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded transition-colors"
                >
                  + {sug}
                </button>

              ))}

            </div>

          </div>

          {/* Payment Method */}
          <div>

            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Payment Method (Source of Funds) *
            </label>

            <div className="grid grid-cols-2 gap-3">

              {/* Cash */}
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-neutral-900 bg-neutral-900/5 font-semibold text-neutral-900'
                    : 'border-neutral-200 text-neutral-600'
                }`}
              >

                <input
                  type="radio"
                  name="payMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() =>
                    setPaymentMethod('cash')
                  }
                  className="sr-only"
                />

                <Wallet className="w-4 h-4" />

                <span>
                  Cash in Hand
                </span>

              </label>

              {/* Bank */}
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                  paymentMethod === 'bank'
                    ? 'border-neutral-900 bg-neutral-900/5 font-semibold text-neutral-900'
                    : 'border-neutral-200 text-neutral-600'
                }`}
              >

                <input
                  type="radio"
                  name="payMethod"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={() =>
                    setPaymentMethod('bank')
                  }
                  className="sr-only"
                />

                <Building className="w-4 h-4" />

                <span>
                  Bank Account
                </span>

              </label>

            </div>

          </div>

          {/* Notes */}
          <div>

            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Optional Note / Receipt Details
            </label>

            <input
              type="text"
              placeholder="e.g. Paid to driver for lumber delivery"
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />

          </div>

          {/* Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">

            <button
              type="button"
              onClick={() =>
                setIsModalOpen(false)
              }
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : 'Save Expense'}
            </button>

          </div>

        </form>

      </Modal>

    </div>
  );
};