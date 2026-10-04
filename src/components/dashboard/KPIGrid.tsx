import React from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Eye, 
  Heart, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  MousePointerClick, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  Pin
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { useI18n } from '../../i18n/I18nContext.js';
import { Card } from '../common/Card.js';

export const KPIGrid: React.FC = () => {
  const { kpis } = useApp();
  const { t } = useI18n();

  const kpiItems = [
    {
      title: t.dashboard.revenue,
      value: `$${kpis.etsy.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      trend: `+${kpis.etsy.revenueTrend}%`,
      isPositive: true,
      subtext: `sur 30 jours`,
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      accent: 'from-emerald-500/10 to-transparent border-emerald-500/20'
    },
    {
      title: t.dashboard.orders,
      value: kpis.etsy.orders.toString(),
      trend: `+${kpis.etsy.ordersTrend}%`,
      isPositive: true,
      subtext: `${kpis.etsy.activeListings} listings actifs`,
      icon: <ShoppingBag className="w-5 h-5 text-indigo-400" />,
      accent: 'from-indigo-500/10 to-transparent border-indigo-500/20'
    },
    {
      title: t.dashboard.outboundClicks,
      value: kpis.pinterest.outboundClicks.toLocaleString(),
      trend: `+${kpis.pinterest.clicksTrend}%`,
      isPositive: true,
      subtext: `CTR: ${kpis.pinterest.ctr}% (${kpis.pinterest.impressions.toLocaleString()} imp.)`,
      icon: <MousePointerClick className="w-5 h-5 text-amber-400" />,
      accent: 'from-amber-500/10 to-transparent border-amber-500/20'
    },
    {
      title: t.dashboard.affiliateRevenue,
      value: `$${kpis.monetization.affiliateRevenue.toFixed(2)}`,
      trend: `+18.4%`,
      isPositive: true,
      subtext: `Tracking & Creator Collective`,
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      accent: 'from-purple-500/10 to-transparent border-purple-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpiItems.map((item, idx) => (
        <Card
          key={idx}
          className={`relative overflow-hidden bg-gradient-to-b ${item.accent} border transition-all duration-200 hover:-translate-y-0.5`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.title}</span>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">{item.icon}</div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white tracking-tight">{item.value}</span>
            <div
              className={`flex items-center text-xs font-bold ${
                item.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {item.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{item.trend}</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400 font-medium">{item.subtext}</div>
        </Card>
      ))}
    </div>
  );
};
