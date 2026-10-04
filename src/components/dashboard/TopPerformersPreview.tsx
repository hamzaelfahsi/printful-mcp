import React from 'react';
import { Package, ArrowRight, Eye, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

export const TopPerformersPreview: React.FC = () => {
  const { products, setActiveTab } = useApp();

  const sorted = [...products].sort((a, b) => b.revenueAmount - a.revenueAmount).slice(0, 3);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Top Produits Performants</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Classés par chiffre d'affaires généré</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('etsy-products')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Tous les produits
          </Button>
        </div>

        <div className="space-y-3 mt-4">
          {sorted.map((prod, idx) => (
            <div
              key={prod.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 font-bold font-mono text-xs text-slate-500">#{idx + 1}</span>
                <img
                  src={prod.primaryImageUrl}
                  alt={prod.title}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate max-w-xs">{prod.title}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-mono text-amber-400 font-bold">${prod.priceAmount.toFixed(2)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {prod.viewsCount.toLocaleString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShoppingBag className="w-3 h-3" /> {prod.salesCount} ventes
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-black text-white">
                  ${prod.revenueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <Badge variant="success" size="sm" className="mt-1">
                  Conv. {prod.conversionRate}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
