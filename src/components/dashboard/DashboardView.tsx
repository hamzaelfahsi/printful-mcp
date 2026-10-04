import React from 'react';
import { KPIGrid } from './KPIGrid.js';
import { ChartsSection } from './ChartsSection.js';
import { AlertBanner } from './AlertBanner.js';
import { QuickActions } from './QuickActions.js';
import { TopPerformersPreview } from './TopPerformersPreview.js';
import { RecentActivityFeed } from './RecentActivityFeed.js';
import { useI18n } from '../../i18n/I18nContext.js';

export const DashboardView: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {t.dashboard.welcome}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t.dashboard.subtitle}
          </p>
        </div>
      </div>

      {/* Alert Banner for pending approval queue */}
      <AlertBanner />

      {/* KPI Cards (Etsy, Pinterest, Traffic, Revenue) */}
      <KPIGrid />

      {/* Interactive Growth Charts & Traffic Breakdown */}
      <ChartsSection />

      {/* Quick Actions Bar */}
      <QuickActions />

      {/* Top Performers & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopPerformersPreview />
        <RecentActivityFeed />
      </div>
    </div>
  );
};
