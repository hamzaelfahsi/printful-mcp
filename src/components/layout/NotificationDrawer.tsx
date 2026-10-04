import React from 'react';
import { X, CheckCheck, Bell, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';

export const NotificationDrawer: React.FC = () => {
  const { 
    isNotificationDrawerOpen, 
    setIsNotificationDrawerOpen, 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useApp();

  if (!isNotificationDrawerOpen) return null;

  const severityIcons = {
    info: <Info className="w-4 h-4 text-cyan-400" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400" />
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => setIsNotificationDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 shadow-2xl shadow-black p-6 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Centre de Notifications</h3>
              <p className="text-xs text-slate-400">Événements système & synchronisations</p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between py-3">
          <span className="text-xs font-semibold text-slate-400">
            {notifications.filter(n => !n.isRead).length} non lues
          </span>
          <button
            onClick={markAllNotificationsAsRead}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Tout marquer comme lu
          </button>
        </div>

        {/* List of notifications */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markNotificationAsRead(notif.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                notif.isRead
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                  : 'bg-slate-850 border-slate-700 shadow-sm shadow-black/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">{severityIcons[notif.severity]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{notif.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
