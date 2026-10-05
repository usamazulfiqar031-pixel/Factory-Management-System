import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FactoryProvider } from './context/FactoryContext';
import { Sidebar, NavItem } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastContainer } from './components/Toast';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RawMaterialsPage } from './pages/RawMaterialsPage';
import { ProductsPage } from './pages/ProductsPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ProductionPage } from './pages/ProductionPage';
import { SalesPage } from './pages/SalesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CustomerPaymentsPage } from './pages/CustomerPaymentsPage';
import { SupplierPaymentsPage } from './pages/SupplierPaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Preselected IDs for payments
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<number | null>(null);
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-neutral-600">Initializing Factory Suite...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigateToReceivePayment = (customerId: number) => {
    setPreselectedCustomerId(customerId);
    setCurrentTab('customer-payments');
  };

  const navigateToPaySupplier = (supplierId: number) => {
    setPreselectedSupplierId(supplierId);
    setCurrentTab('supplier-payments');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setPreselectedCustomerId(null);
          setPreselectedSupplierId(null);
        }}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopBar
          currentTab={currentTab}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 pb-16">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {currentTab === 'materials' && <RawMaterialsPage />}
          {currentTab === 'products' && <ProductsPage />}
          {currentTab === 'purchases' && <PurchasesPage />}
          {currentTab === 'production' && <ProductionPage />}
          {currentTab === 'sales' && <SalesPage />}
          {currentTab === 'customers' && (
            <CustomersPage onNavigateToReceivePayment={navigateToReceivePayment} />
          )}
          {currentTab === 'suppliers' && (
            <SuppliersPage onNavigateToPaySupplier={navigateToPaySupplier} />
          )}
          {currentTab === 'expenses' && <ExpensesPage />}
          {currentTab === 'customer-payments' && (
            <CustomerPaymentsPage preselectedCustomerId={preselectedCustomerId} />
          )}
          {currentTab === 'supplier-payments' && (
            <SupplierPaymentsPage preselectedSupplierId={preselectedSupplierId} />
          )}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FactoryProvider>
        <MainLayout />
      </FactoryProvider>
    </AuthProvider>
  );
}
