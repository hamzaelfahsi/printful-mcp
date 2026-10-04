import React from 'react';
import { Sparkles, Pin, PlusCircle, Link2, BarChart2, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';

export const QuickActions: React.FC = () => {
  const { setActiveTab } = useApp();

  const actions = [
    {
      title: 'Générateur de Pins IA',
      desc: 'Créer du contenu viral pour Pinterest',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      tab: 'content-generator' as const,
      border: 'hover:border-amber-500/40'
    },
    {
      title: 'Gérer les Produits Etsy',
      desc: 'Optimiser titres, tags & descriptions',
      icon: <PlusCircle className="w-5 h-5 text-indigo-400" />,
      tab: 'etsy-products' as const,
      border: 'hover:border-indigo-500/40'
    },
    {
      title: 'Créer un Lien Affilié',
      desc: 'Générer une URL traquée conforme',
      icon: <Link2 className="w-5 h-5 text-emerald-400" />,
      tab: 'affiliate-links' as const,
      border: 'hover:border-emerald-500/40'
    },
    {
      title: 'Calendrier de Publication',
      desc: 'Planifier et synchroniser vos posts',
      icon: <Calendar className="w-5 h-5 text-purple-400" />,
      tab: 'content-calendar' as const,
      border: 'hover:border-purple-500/40'
    }
  ];

  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        Actions Rapides & Productivité
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {actions.map((act, idx) => (
          <Card
            key={idx}
            hoverEffect
            onClick={() => setActiveTab(act.tab)}
            className={`p-4 transition-all duration-200 border-slate-800 ${act.border}`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                {act.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{act.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{act.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
