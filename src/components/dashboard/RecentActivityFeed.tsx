import React from 'react';
import { History, ShieldCheck, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';

export const RecentActivityFeed: React.FC = () => {
  const activities = [
    {
      action: 'PINTEREST_PIN_PUBLISHED',
      desc: 'Épingle "Celestial Dragon" publiée avec succès sur le tableau Aesthetic Art.',
      time: 'Il y a 25 min',
      status: 'success'
    },
    {
      action: 'ETSY_SYNC_COMPLETED',
      desc: 'Synchronisation automatique API v3 : 24 listings et métriques rafraîchis.',
      time: 'Il y a 1h',
      status: 'info'
    },
    {
      action: 'AI_SEO_GENERATED',
      desc: 'Optimisation SEO & 13 tags générés pour Mystic Kitsune Case.',
      time: 'Il y a 3h',
      status: 'success'
    },
    {
      action: 'AFFILIATE_CLICK',
      desc: 'Redirection traquée enregistrée via campagne pin-autumn-dragon.',
      time: 'Il y a 4h',
      status: 'info'
    }
  ];

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Journal d'Activité & Audit</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Traçabilité en temps réel des actions système</p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">AES-256</span>
        </div>

        <div className="space-y-3 mt-4">
          {activities.map((act, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-amber-400">
                    {act.action}
                  </span>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{act.time}</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{act.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
