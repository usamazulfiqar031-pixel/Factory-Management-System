import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Package,
  ShoppingBag,
  Factory,
  Receipt,
  Users,
  Building2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFactory } from '../context/FactoryContext';

export type NavItem =
  | 'dashboard'
  | 'materials'
  | 'products'
  | 'purchases'
  | 'production'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'customer-payments'
  | 'supplier-payments'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const { settings } = useFactory();

  const navSections: Array<{
    title: string;
    items: Array<{ id: NavItem; label: string; icon: React.ComponentType<{ className?: string }> }>;
  }> = [
    {
      title: 'Overview',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Operations',
      items: [
        { id: 'materials', label: 'Raw Materials', icon: Layers },
        { id: 'products', label: 'Finished Products', icon: Package },
        { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
        { id: 'production', label: 'Production', icon: Factory },
        { id: 'sales', label: 'Sales & Billing', icon: Receipt },
      ],
    },
    {
      title: 'Partners & Ledger',
      items: [
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'suppliers', label: 'Suppliers', icon: Building2 },
      ],
    },
    {
      title: 'Finance & Cash Flow',
      items: [
        { id: 'expenses', label: 'Expenses', icon: Wallet },
        { id: 'customer-payments', label: 'Customer Payments', icon: ArrowDownLeft },
        { id: 'supplier-payments', label: 'Supplier Payments', icon: ArrowUpRight },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'settings', label: 'Settings / Setup', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-neutral-900 text-neutral-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-neutral-800`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              FM
            </div>
            <div className="truncate">
              <span className="text-sm font-semibold tracking-tight text-white block truncate">
                {settings?.factory_name || 'Factory System'}
              </span>
              <span className="text-[11px] text-neutral-400 block -mt-0.5">Manufacturing Suite</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <div className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {sec.title}
              </div>
              <div className="space-y-0.5 mt-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                        isActive
                          ? 'bg-neutral-800 text-white font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="truncate">
              <div className="text-xs font-medium text-white truncate">{user?.name || 'Manager'}</div>
              <div className="text-[11px] text-neutral-400 capitalize">{user?.role || 'Admin'}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
