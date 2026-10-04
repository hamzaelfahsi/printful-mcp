import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  ClipboardList, 
  Pin as PinIcon, 
  Layers, 
  CalendarClock, 
  Sparkles, 
  ListOrdered, 
  Calendar as CalendarIcon, 
  BarChart3, 
  TrendingUp, 
  Link2, 
  Lightbulb, 
  Settings, 
  Compass, 
  ShieldCheck,
  RefreshCw,
  History
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { useI18n } from '../../i18n/I18nContext.js';
import { NavigationTab } from '../../types/index.js';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, contentQueue } = useApp();
  const { t } = useI18n();

  const pendingApprovalsCount = contentQueue.filter((c) => c.status === 'ready').length;

  interface NavItem {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const sections: NavSection[] = [
    {
      title: 'VUE GLOBALE',
      items: [
        {
          id: 'dashboard',
          label: t.nav.dashboard,
          icon: <LayoutDashboard className="w-4 h-4" />
        }
      ]
    },
    {
      title: t.nav.store,
      items: [
        {
          id: 'etsy-products',
          label: t.nav.products,
          icon: <Package className="w-4 h-4" />
        },
        {
          id: 'etsy-orders',
          label: t.nav.orders,
          icon: <ShoppingBag className="w-4 h-4" />,
          badge: '142'
        },
        {
          id: 'etsy-sync',
          label: 'Diff & Synchronisation',
          icon: <RefreshCw className="w-4 h-4 text-amber-400" />
        }
      ]
    },
    {
      title: t.nav.pinterest,
      items: [
        {
          id: 'pinterest-pins',
          label: t.nav.pins,
          icon: <PinIcon className="w-4 h-4" />
        },
        {
          id: 'pinterest-boards',
          label: t.nav.boards,
          icon: <Layers className="w-4 h-4" />
        },
        {
          id: 'pinterest-scheduler',
          label: t.nav.scheduler,
          icon: <CalendarClock className="w-4 h-4" />
        }
      ]
    },
    {
      title: t.nav.content,
      items: [
        {
          id: 'content-generator',
          label: t.nav.aiGenerator,
          icon: <Sparkles className="w-4 h-4 text-amber-400" />
        },
        {
          id: 'content-queue',
          label: t.nav.contentQueue,
          icon: <ListOrdered className="w-4 h-4" />,
          badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} à valider` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        },
        {
          id: 'content-calendar',
          label: t.nav.calendar,
          icon: <CalendarIcon className="w-4 h-4" />
        }
      ]
    },
    {
      title: t.nav.analytics,
      items: [
        {
          id: 'analytics-overview',
          label: t.nav.overview,
          icon: <BarChart3 className="w-4 h-4" />
        },
        {
          id: 'analytics-products',
          label: t.nav.productAnalytics,
          icon: <TrendingUp className="w-4 h-4" />
        }
      ]
    },
    {
      title: t.nav.monetization,
      items: [
        {
          id: 'affiliate-links',
          label: t.nav.affiliateLinks,
          icon: <Link2 className="w-4 h-4" />
        }
      ]
    },
    {
      title: t.nav.ai,
      items: [
        {
          id: 'ai-insights',
          label: t.nav.insights,
          icon: <Lightbulb className="w-4 h-4 text-indigo-400" />,
          badge: '2 New',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        }
      ]
    },
    {
      title: 'CONFIGURATION',
      items: [
        {
          id: 'settings',
          label: t.nav.settings,
          icon: <Settings className="w-4 h-4" />
        }
      ]
    }
  ];

  return (
    <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950">
          <Compass className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-white text-base">ETSYPILOT</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              AI
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Control Center • Studio</p>
        </div>
      </div>

      {/* Navigation Links Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/15 to-indigo-500/15 text-white border border-amber-500/30 shadow-sm shadow-amber-500/5'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                          item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Security Badge */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-white block">Workflow Sécurisé</span>
              <span className="text-[9px] text-slate-400">Zero Unintended Action</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </aside>
  );
};
