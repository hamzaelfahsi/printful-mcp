import React from 'react';
import { I18nProvider } from './i18n/I18nContext.js';
import { AppProvider, useApp } from './context/AppContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';
import { ToastContainer } from './components/common/Toast.js';
import { ConfirmDialog } from './components/common/ConfirmDialog.js';
import { NotificationDrawer } from './components/layout/NotificationDrawer.js';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal.js';

// Views
import { DashboardView } from './components/dashboard/DashboardView.js';
import { EtsyProductsView } from './components/views/EtsyProductsView.js';
import { EtsyOrdersView } from './components/views/EtsyOrdersView.js';
import { EtsySyncView } from './components/views/EtsySyncView.js';
import { PinterestPinsView } from './components/views/PinterestPinsView.js';
import { PinterestBoardsView } from './components/views/PinterestBoardsView.js';
import { ContentGeneratorView } from './components/views/ContentGeneratorView.js';
import { ContentQueueView } from './components/views/ContentQueueView.js';
import { PublicationCenterView } from './components/views/PublicationCenterView.js';
import { CalendarView } from './components/views/CalendarView.js';
import { AffiliateView } from './components/views/AffiliateView.js';
import { AIInsightsView } from './components/views/AIInsightsView.js';
import { AnalyticsOverviewView } from './components/views/AnalyticsOverviewView.js';
import { SettingsView } from './components/views/SettingsView.js';

const MainLayout: React.FC = () => {
  const { activeTab, confirmDialog, closeConfirmDialog } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'etsy-products':
      case 'etsy-listings':
        return <EtsyProductsView />;
      case 'etsy-orders':
        return <EtsyOrdersView />;
      case 'etsy-sync':
      case 'etsy-sync-history':
        return <EtsySyncView />;
      case 'pinterest-pins':
        return <PinterestPinsView />;
      case 'pinterest-boards':
        return <PinterestBoardsView />;
      case 'pinterest-scheduler':
      case 'content-calendar':
        return <PublicationCenterView />;
      case 'content-generator':
      case 'ai-ideas':
        return <ContentGeneratorView />;
      case 'content-queue':
        return <ContentQueueView />;
      case 'analytics-overview':
      case 'analytics-etsy':
      case 'analytics-pinterest':
      case 'analytics-products':
      case 'analytics-traffic':
        return <AnalyticsOverviewView />;
      case 'affiliate-links':
      case 'affiliate-clicks':
      case 'affiliate-conversions':
        return <AffiliateView />;
      case 'ai-insights':
      case 'ai-recommendations':
        return <AIInsightsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-7xl mx-auto pb-12">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Notifications */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
          onClose={closeConfirmDialog}
        />
      )}

      <ToastContainer />
      <NotificationDrawer />
      <GlobalSearchModal />
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </I18nProvider>
  );
}
