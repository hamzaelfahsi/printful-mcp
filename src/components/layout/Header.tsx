import React from 'react';
import { 
  Search, 
  Bell, 
  RefreshCw, 
  Globe, 
  Moon, 
  Sun, 
  ShieldAlert, 
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { useI18n } from '../../i18n/I18nContext.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';

export const Header: React.FC = () => {
  const { 
    isDemoMode, 
    setIsDemoMode, 
    theme, 
    toggleTheme, 
    notifications, 
    setIsNotificationDrawerOpen, 
    setIsGlobalSearchOpen,
    refreshData,
    contentQueue,
    setActiveTab
  } = useApp();
  const { language, setLanguage, t } = useI18n();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pendingApprovalsCount = contentQueue.filter((c) => c.status === 'ready').length;

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between z-20 shrink-0 sticky top-0">
      {/* Search Input Trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={() => setIsGlobalSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition-all text-xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
            <span>{t.header.searchPlaceholder}</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions & Utilities */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-amber-400 font-bold text-[11px] tracking-wide">
            {isDemoMode ? t.header.demoModeActive : 'MODE LIVE RÉEL'}
          </span>
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className="text-[10px] text-slate-400 hover:text-white underline underline-offset-2 ml-1"
          >
            {isDemoMode ? 'Passer en Live' : 'Mode Démo'}
          </button>
        </div>

        {/* Pending Approval Shortcut Button */}
        {pendingApprovalsCount > 0 && (
          <button
            onClick={() => setActiveTab('content-queue')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{pendingApprovalsCount} en attente</span>
          </button>
        )}

        {/* Sync Trigger */}
        <button
          onClick={refreshData}
          title={t.actions.syncNow}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          title="Changer de langue / Switch Language"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{language.toUpperCase()}</span>
        </button>

        {/* Notifications Drawer Button */}
        <button
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-slate-950">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Avatar & Shop Name */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
            CC
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs font-bold text-white block leading-tight">Craft Cases Studio</span>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Etsy & Pinterest Connectés
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
