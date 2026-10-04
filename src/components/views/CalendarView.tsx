import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Pin, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

export const CalendarView: React.FC = () => {
  const { contentQueue, setActiveTab } = useApp();
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');

  const days = ['Lundi 5 Oct', 'Mardi 6 Oct', 'Mercredi 7 Oct', 'Jeudi 8 Oct', 'Vendredi 9 Oct', 'Samedi 10 Oct', 'Dimanche 11 Oct'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-purple-400" />
            <span>Calendrier de Publication</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualisation temporelle de vos publications Pinterest et mises à jour Etsy
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="amber"
            size="sm"
            onClick={() => setActiveTab('content-generator')}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Planifier un Post
          </Button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day, idx) => (
          <Card key={idx} className="p-3 bg-slate-900 border-slate-800 flex flex-col min-h-[300px]">
            <div className="pb-2 border-b border-slate-800 text-center">
              <span className="text-xs font-bold text-white block">{day}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {idx === 0 ? '2 programmés' : '0 post'}
              </span>
            </div>

            <div className="flex-1 space-y-2 mt-2">
              {idx === 0 && (
                <>
                  <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400 font-bold">10:00</span>
                      <Badge variant="purple" size="sm">Pin</Badge>
                    </div>
                    <p className="text-white font-medium line-clamp-2">
                      Celestial Dragon Phone Case
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-amber-400 font-bold">16:30</span>
                      <Badge variant="warning" size="sm">Etsy</Badge>
                    </div>
                    <p className="text-white font-medium line-clamp-2">
                      SEO Refresh Kitsune Case
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
