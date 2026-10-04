import React from 'react';
import { AlertCircle, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Button } from '../common/Button.js';

export const AlertBanner: React.FC = () => {
  const { contentQueue, setActiveTab } = useApp();
  const pendingApprovals = contentQueue.filter((c) => c.status === 'ready');

  if (pendingApprovals.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{pendingApprovals.length} nouveau(x) contenu(s) prêts pour validation</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Workflow d’Approbation
            </span>
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            L’IA a généré des variantes pour vos produits phares. Vérifiez et approuvez avant publication.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="amber"
          size="sm"
          onClick={() => setActiveTab('content-queue')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Accéder à la File d’Attente
        </Button>
      </div>
    </div>
  );
};
