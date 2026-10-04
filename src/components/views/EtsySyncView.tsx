import React, { useState } from 'react';
import { 
  RefreshCw, 
  GitCompare, 
  History, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  ShoppingBag, 
  ExternalLink,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { ProductDiffResult, SyncRun } from '../../types/index.js';

export const EtsySyncView: React.FC = () => {
  const { products, showToast, showConfirmDialog } = useApp();
  const [activeTab, setActiveTab] = useState<'diff' | 'history'>('diff');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'FULL' | 'INCREMENTAL'>('FULL');

  // Simulated diff state based on live and local products
  const [diffResults, setDiffResults] = useState<ProductDiffResult[]>([
    {
      listingId: 1849203941,
      title: 'Japanese Celestial Dragon Stained Glass Art Phone Case',
      changeType: 'MODIFIED',
      hasConflict: false,
      recommendedAction: 'ACCEPT_ETSY',
      fieldDiffs: [
        {
          fieldName: 'Titre',
          localValue: 'Japanese Celestial Dragon Phone Case',
          etsyValue: 'Japanese Celestial Dragon Stained Glass Art Phone Case',
          isDifferent: true
        },
        {
          fieldName: 'Prix ($)',
          localValue: 32.50,
          etsyValue: 34.90,
          isDifferent: true
        }
      ]
    },
    {
      listingId: 1849203942,
      title: 'Mystic Kitsune Fox Deity Art Nouveau Phone Case',
      changeType: 'UNCHANGED',
      hasConflict: false,
      recommendedAction: 'KEEP_LOCAL',
      fieldDiffs: []
    },
    {
      listingId: 1849203944,
      title: 'Midnight Sakura Blossom Stained Glass Case',
      changeType: 'ADDED',
      hasConflict: false,
      recommendedAction: 'ACCEPT_ETSY',
      fieldDiffs: [
        {
          fieldName: 'Nouveau Listing sur Etsy',
          localValue: null,
          etsyValue: 'Midnight Sakura Blossom Stained Glass Case',
          isDifferent: true
        }
      ]
    }
  ]);

  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([
    {
      id: 'sync_101',
      shopId: '18492039',
      type: 'FULL_SYNC',
      startedAt: '2026-10-03T07:15:00Z',
      completedAt: '2026-10-03T07:15:04Z',
      status: 'SUCCESS',
      itemsProcessed: 24,
      itemsCreated: 1,
      itemsUpdated: 2,
      itemsDeleted: 0,
      errorsCount: 0
    },
    {
      id: 'sync_100',
      shopId: '18492039',
      type: 'INCREMENTAL_SYNC',
      startedAt: '2026-10-03T06:30:00Z',
      completedAt: '2026-10-03T06:30:02Z',
      status: 'SUCCESS',
      itemsProcessed: 24,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      errorsCount: 0
    }
  ]);

  const handleTriggerSync = (type: 'FULL_SYNC' | 'INCREMENTAL_SYNC') => {
    setIsSyncing(true);
    setSyncType(type === 'FULL_SYNC' ? 'FULL' : 'INCREMENTAL');

    setTimeout(() => {
      setIsSyncing(false);
      const newRun: SyncRun = {
        id: `sync_${Date.now()}`,
        shopId: '18492039',
        type,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'SUCCESS',
        itemsProcessed: products.length,
        itemsCreated: 0,
        itemsUpdated: 1,
        itemsDeleted: 0,
        errorsCount: 0
      };
      setSyncRuns([newRun, ...syncRuns]);
      showToast({
        type: 'success',
        title: `${type === 'FULL_SYNC' ? 'Synchronisation Complète' : 'Synchronisation Incrémentale'} terminée`,
        message: `${products.length} listings scannés. Catalogue à jour.`
      });
    }, 1200);
  };

  const handleResolveDiff = (listingId: number, action: 'ACCEPT_ETSY' | 'KEEP_LOCAL') => {
    setDiffResults((prev) => prev.filter((d) => d.listingId !== listingId));
    showToast({
      type: 'info',
      title: action === 'ACCEPT_ETSY' ? 'Modifications Etsy appliquées' : 'Version locale conservée',
      message: `Résolution enregistrée pour le listing #${listingId}.`
    });
  };

  const badgeColor = (type: string) => {
    switch (type) {
      case 'ADDED':
        return 'success';
      case 'MODIFIED':
        return 'warning';
      case 'CONFLICT':
        return 'danger';
      case 'DELETED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <RefreshCw className="w-6 h-6 text-amber-400" />
            <span>Centre de Synchronisation & Diff Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comparaison bidirectionnelle entre votre base locale et l'API Etsy v3
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            loading={isSyncing && syncType === 'INCREMENTAL'}
            onClick={() => handleTriggerSync('INCREMENTAL_SYNC')}
            icon={<Zap className="w-4 h-4 text-amber-400" />}
          >
            Sync Incrémentale
          </Button>

          <Button
            variant="amber"
            size="sm"
            loading={isSyncing && syncType === 'FULL'}
            onClick={() => handleTriggerSync('FULL_SYNC')}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Pleine Synchronisation (Full Sync)
          </Button>
        </div>
      </div>

      {/* Connection Banner */}
      <Card className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border-emerald-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Etsy Connecté :</span>
                <span className="text-xs font-bold text-emerald-400">CraftCasesStudio</span>
                <Badge variant="success" size="sm">OAuth 2.0 PKCE Actif</Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dernière synchronisation : 03 Octobre 2026 à 14:22 • {products.length} produits • 142 commandes
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Sub Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-xs">
        <button
          onClick={() => setActiveTab('diff')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'diff'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          Diff & Conflits ({diffResults.filter((d) => d.changeType !== 'UNCHANGED').length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Historique ({syncRuns.length})
        </button>
      </div>

      {activeTab === 'diff' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Produits Scannés</span>
              <div className="text-xl font-black text-white font-mono mt-1">{products.length}</div>
            </Card>
            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-[11px] font-bold text-amber-400 uppercase">Modifiés / Différences</span>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">
                {diffResults.filter((d) => d.changeType === 'MODIFIED').length}
              </div>
            </Card>
            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Ajoutés sur Etsy</span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {diffResults.filter((d) => d.changeType === 'ADDED').length}
              </div>
            </Card>
            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-[11px] font-bold text-rose-400 uppercase">Conflits Détectés</span>
              <div className="text-xl font-black text-rose-400 font-mono mt-1">
                {diffResults.filter((d) => d.changeType === 'CONFLICT').length}
              </div>
            </Card>
          </div>

          {/* Diff Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-3.5 px-4">Listing / ID</th>
                  <th className="py-3.5 px-4">Statut Diff</th>
                  <th className="py-3.5 px-4">Base Locale</th>
                  <th className="py-3.5 px-4">Actuel sur Etsy API</th>
                  <th className="py-3.5 px-4 text-right">Actions d'Arbitrage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {diffResults.map((diff) => (
                  <tr key={diff.listingId} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <h4 className="font-bold text-white">{diff.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">#{diff.listingId}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={badgeColor(diff.changeType)} size="sm" dot>
                        {diff.changeType}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {diff.fieldDiffs.length > 0 ? (
                        <div className="space-y-1">
                          {diff.fieldDiffs.map((fd, idx) => (
                            <div key={idx}>
                              <span className="text-slate-500 text-[10px]">{fd.fieldName} : </span>
                              <span className="font-mono text-white">{String(fd.localValue ?? 'N/A')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Identique</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {diff.fieldDiffs.length > 0 ? (
                        <div className="space-y-1">
                          {diff.fieldDiffs.map((fd, idx) => (
                            <div key={idx}>
                              <span className="text-slate-500 text-[10px]">{fd.fieldName} : </span>
                              <span className="font-mono text-amber-400 font-semibold">
                                {String(fd.etsyValue ?? 'N/A')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Identique</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {diff.changeType !== 'UNCHANGED' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResolveDiff(diff.listingId, 'KEEP_LOCAL')}
                          >
                            Garder Local
                          </Button>
                          <Button
                            variant="amber"
                            size="sm"
                            onClick={() => handleResolveDiff(diff.listingId, 'ACCEPT_ETSY')}
                          >
                            Accepter Etsy
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">Synchronisé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Sync Runs History */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-3.5 px-4">Run ID</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Articles Scannés</th>
                <th className="py-3.5 px-4">Créés / Mis à jour</th>
                <th className="py-3.5 px-4">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {syncRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-850 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{run.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-300">{run.type}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={run.status === 'SUCCESS' ? 'success' : 'danger'} size="sm" dot>
                      {run.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{run.itemsProcessed}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">
                    +{run.itemsCreated} / ~{run.itemsUpdated}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(run.startedAt).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
