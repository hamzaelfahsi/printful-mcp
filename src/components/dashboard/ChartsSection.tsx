import React, { useState } from 'react';
import { Card } from '../common/Card.js';
import { Button } from '../common/Button.js';
import { TrendingUp, BarChart2, PieChart, ArrowUpRight } from 'lucide-react';

export const ChartsSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Realistic time series points
  const revenuePoints = [320, 450, 410, 560, 680, 590, 720, 840, 790, 950, 1120, 1080, 1340];
  const clicksPoints = [120, 180, 220, 310, 290, 410, 480, 520, 610, 690, 840, 920, 1050];

  const maxRev = Math.max(...revenuePoints);
  const maxClicks = Math.max(...clicksPoints);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main Revenue & Traffic Growth Chart */}
      <Card className="lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Croissance des Revenus & Clics Pinterest</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Corrélation directe entre promotion Pinterest et ventes Etsy
              </p>
            </div>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    timeRange === range
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div className="h-56 mt-6 relative flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.75" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.75" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.75" />

              {/* Revenue Area & Curve */}
              <path
                d={`M 0 160 ${revenuePoints
                  .map((p, i) => `L ${(i * 500) / (revenuePoints.length - 1)} ${150 - (p / maxRev) * 120}`)
                  .join(' ')} L 500 160 Z`}
                fill="url(#gradRevenue)"
              />
              <path
                d={`M 0 ${150 - (revenuePoints[0] / maxRev) * 120} ${revenuePoints
                  .map((p, i) => `L ${(i * 500) / (revenuePoints.length - 1)} ${150 - (p / maxRev) * 120}`)
                  .join(' ')}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Pinterest Clicks Area & Curve */}
              <path
                d={`M 0 160 ${clicksPoints
                  .map((p, i) => `L ${(i * 500) / (clicksPoints.length - 1)} ${150 - (p / maxClicks) * 110}`)
                  .join(' ')} L 500 160 Z`}
                fill="url(#gradClicks)"
              />
              <path
                d={`M 0 ${150 - (clicksPoints[0] / maxClicks) * 110} ${clicksPoints
                  .map((p, i) => `L ${(i * 500) / (clicksPoints.length - 1)} ${150 - (p / maxClicks) * 110}`)
                  .join(' ')}`}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeDasharray="2 0"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Legend & Summary */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-300 font-medium">Revenus Etsy ($)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-300 font-medium">Clics Sortants Pinterest</span>
            </div>
          </div>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +21.8% ce mois
          </span>
        </div>
      </Card>

      {/* Traffic Acquisition Breakdown */}
      <Card className="flex flex-col justify-between">
        <div>
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <span>Sources de Trafic & Clics</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Répartition du trafic entrant</p>
          </div>

          <div className="space-y-4 my-5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Trafic Direct & Recherche Etsy</span>
                <span className="text-white font-mono">54.5% (8,420)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '54.5%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Campagnes & Épingles Pinterest</span>
                <span className="text-white font-mono">33.7% (5,210)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '33.7%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Liens Affiliés & Tracking</span>
                <span className="text-white font-mono">11.8% (1,840)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '11.8%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-200">Impact Pinterest : </span>
          Pinterest génère actuellement <span className="text-amber-400 font-bold">45.5%</span> de l'ensemble de vos commandes confirmées.
        </div>
      </Card>
    </div>
  );
};
