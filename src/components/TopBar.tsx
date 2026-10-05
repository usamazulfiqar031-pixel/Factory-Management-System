import React from 'react';
import { Menu, RotateCcw, Plus, Sparkles } from 'lucide-react';
import { useFactory } from '../context/FactoryContext';
import { NavItem } from './Sidebar';

interface TopBarProps {
  currentTab: NavItem;
  onOpenMobile: () => void;
  onQuickAction?: () => void;
  quickActionLabel?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenMobile,
  onQuickAction,
  quickActionLabel,
}) => {
  const { settings, triggerRefresh, currency } = useFactory();

  const titles: Record<NavItem, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Dashboard', subtitle: "Live operations, liquidity & today's pulse" },
    materials: { title: 'Raw Materials Inventory', subtitle: 'Manage stock levels, purchase prices & minimum alerts' },
    products: { title: 'Finished Products & BOM', subtitle: 'Product catalog & Bill of Materials specification' },
    purchases: { title: 'Purchases & Procurement', subtitle: 'Inbound raw materials, costs & supplier balance' },
    production: { title: 'Production Batches', subtitle: 'Raw material transformation & finished output' },
    sales: { title: 'Sales & Billing', subtitle: 'Invoices, receivables, and Cost of Goods Sold' },
    customers: { title: 'Customer Directory', subtitle: 'Accounts receivable and customer sales ledger' },
    suppliers: { title: 'Supplier Directory', subtitle: 'Accounts payable and procurement ledger' },
    expenses: { title: 'Operational Expenses', subtitle: 'Direct expense tracking for accurate net profit' },
    'customer-payments': { title: 'Customer Payments', subtitle: 'Receive customer balance payments' },
    'supplier-payments': { title: 'Supplier Payments', subtitle: 'Disburse supplier balance payments' },
    reports: { title: 'Intelligence & Reports', subtitle: 'Daily, monthly, inventory audit & balances' },
    settings: { title: 'Factory Settings', subtitle: 'Factory details, currency, balances & demo setup' },
  };

  const current = titles[currentTab] || { title: 'Factory Management', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Zone 1: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{settings?.factory_name || 'Plant'}</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-neutral-900">{current.title}</span>
          </div>
          <p className="hidden md:block text-xs text-neutral-400 mt-0.5 truncate max-w-md">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={triggerRefresh}
          title="Refresh Data"
          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {onQuickAction && quickActionLabel && (
          <button
            onClick={onQuickAction}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{quickActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
};
