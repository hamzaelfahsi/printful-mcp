import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Plus, 
  MousePointerClick, 
  DollarSign, 
  ExternalLink, 
  ShieldCheck, 
  Copy, 
  Check, 
  TrendingUp, 
  Calendar, 
  Layers, 
  Sparkles, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  RefreshCw,
  Info,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { 
  MonetizationOverviewKPIs, 
  AffiliateCampaign, 
  AffiliateConversionRecord, 
  AffiliateCommissionRecord, 
  AffiliatePayoutRecord, 
  CampaignStatus, 
  CommissionStatus 
} from '../../types/index.js';

export const AffiliateView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'links' | 'conversions' | 'commissions' | 'payouts' | 'import'>('overview');
  
  // State
  const [kpis, setKpis] = useState<MonetizationOverviewKPIs | null>(null);
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);
  const [conversions, setConversions] = useState<AffiliateConversionRecord[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommissionRecord[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayoutRecord[]>([]);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<any[]>([]);

  // Create Campaign Form
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignPlatform, setNewCampaignPlatform] = useState<'pinterest' | 'etsy' | 'both'>('pinterest');
  const [newCampaignChannel, setNewCampaignChannel] = useState('pinterest_profile');
  const [newCampaignDisclosure, setNewCampaignDisclosure] = useState('Certains liens sont des liens affiliés. Je peux percevoir une commission sur les achats éligibles.');

  // Import State
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchMonetizationData();
  }, []);

  const fetchMonetizationData = async () => {
    try {
      const [kpiRes, campRes, convRes, commRes, payRes, tsRes, linkRes] = await Promise.all([
        fetch('/api/monetization/overview').then((r) => r.json()),
        fetch('/api/monetization/campaigns').then((r) => r.json()),
        fetch('/api/monetization/conversions').then((r) => r.json()),
        fetch('/api/monetization/commissions').then((r) => r.json()),
        fetch('/api/monetization/payouts').then((r) => r.json()),
        fetch('/api/monetization/performance?days=30').then((r) => r.json()),
        fetch('/api/tracking/links').then((r) => r.json())
      ]);

      setKpis(kpiRes);
      setCampaigns(campRes);
      setConversions(convRes);
      setCommissions(commRes);
      setPayouts(payRes);
      setTimeSeries(tsRes);
      setTrackingLinks(linkRes);
    } catch (e) {
      console.error('Error loading monetization data:', e);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
      const res = await fetch('/api/monetization/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaignName,
          platform: newCampaignPlatform,
          channel: newCampaignChannel,
          channelStatus: 'AUTHORIZED',
          disclosureText: newCampaignDisclosure
        })
      });
      if (!res.ok) throw new Error('Erreur lors de la création de la campagne');
      showToast({
        type: 'success',
        title: 'Campagne Créée',
        message: `La campagne "${newCampaignName}" a été enregistrée à l'état DRAFT.`
      });
      setIsCampaignModalOpen(false);
      setNewCampaignName('');
      await fetchMonetizationData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erreur', message: err.message });
    }
  };

  const handleUpdateCampaignStatus = async (id: string, status: CampaignStatus) => {
    try {
      const res = await fetch(`/api/monetization/campaigns/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Impossible de mettre à jour le statut');
      }
      showToast({
        type: 'success',
        title: 'Statut Mis à Jour',
        message: `La campagne est maintenant ${status}.`
      });
      await fetchMonetizationData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Action Bloquée', message: err.message });
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setIsImporting(true);
    try {
      const res = await fetch('/api/monetization/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvContent })
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        showToast({
          type: 'success',
          title: 'Importation Réussie',
          message: `${data.importedCount} enregistrements importés (${data.duplicateCount} doublons ignorés).`
        });
        await fetchMonetizationData();
      } else {
        showToast({
          type: 'warning',
          title: 'Importation Partielle',
          message: data.errors?.[0] || 'Des erreurs sont survenues.'
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Échec de l’import', message: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/t/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    showToast({ type: 'info', title: 'Lien copié dans le presse-papier' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Moteur de Monétisation & Affiliation</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Phase 7 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gestion des liens, conversions, ventes éligibles et commissions avec étanchéité stricte (Clic ≠ Conversion ≠ Commission).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="amber"
            size="sm"
            onClick={() => setIsCampaignModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Nouvelle Campagne
          </Button>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <strong className="text-white block font-semibold">Règles d'affiliation & Transparence Légale :</strong>
          <p>
            Etsy opère son programme d'affiliation via des réseaux tiers (ex: Awin / Creator Collective). Les commissions dépendent exclusivement de ventes éligibles vérifiées (cookie 30j). Un clic ne présume jamais d'une commission. Tout lien public doit inclure la mention obligatoire de transparence.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        {[
          { id: 'overview', label: 'Vue d’ensemble', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'campaigns', label: 'Campagnes', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'links', label: 'Liens Affiliés & Tracking', icon: <Link2 className="w-3.5 h-3.5" /> },
          { id: 'conversions', label: 'Conversions & Ventes Éligibles', icon: <CheckCircle className="w-3.5 h-3.5" /> },
          { id: 'commissions', label: 'Commissions', icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { id: 'payouts', label: 'Versements (Payouts)', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'import', label: 'Centre d’Import CSV/JSON', icon: <Upload className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && kpis && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-2 bg-slate-900 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Clics Traqués</span>
                <Badge variant="info">Calcul Interne</Badge>
              </div>
              <div className="text-2xl font-black text-white">{kpis.affiliateClicks.value.toLocaleString()}</div>
              <p className="text-[11px] text-slate-400">{kpis.affiliateClicks.description}</p>
            </Card>

            <Card className="p-4 space-y-2 bg-slate-900 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Ventes Éligibles</span>
                <Badge variant="success">Import Réseau</Badge>
              </div>
              <div className="text-2xl font-black text-emerald-400">{kpis.qualifyingSales.value.toLocaleString()}</div>
              <p className="text-[11px] text-slate-400">{kpis.qualifyingSales.description}</p>
            </Card>

            <Card className="p-4 space-y-2 bg-slate-900 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Commissions Approuvées</span>
                <Badge variant="success">Vérifié Réseau</Badge>
              </div>
              <div className="text-2xl font-black text-white">${kpis.approvedCommission.value.toFixed(2)}</div>
              <p className="text-[11px] text-slate-400">{kpis.approvedCommission.description}</p>
            </Card>

            <Card className="p-4 space-y-2 bg-slate-900 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Paiements Reçus</span>
                <Badge variant="purple">Clôturé</Badge>
              </div>
              <div className="text-2xl font-black text-amber-400">${kpis.paidPayout.value.toFixed(2)}</div>
              <p className="text-[11px] text-slate-400">{kpis.paidPayout.description}</p>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Évolution des Clics et Commissions dans le Temps</span>
            </h3>

            <div className="h-60 w-full flex items-end gap-1.5 pt-4 border-b border-slate-800 pb-2">
              {timeSeries.slice(-20).map((pt, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-950 border border-slate-700 p-1.5 rounded-lg text-[10px] text-white z-20 whitespace-nowrap shadow-xl">
                    <span className="font-bold text-emerald-400">{pt.date}</span>
                    <span>{pt.clicks} clics | {pt.conversions} conv.</span>
                    <span>Approuvé: ${pt.commissionApproved.toFixed(2)}</span>
                  </div>

                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    <div
                      style={{ height: `${Math.min(100, Math.max(10, (pt.clicks / 60) * 100))}%` }}
                      className="w-full max-w-[8px] bg-emerald-500/80 rounded-t-sm group-hover:bg-emerald-400"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 truncate w-full text-center">
                    {pt.date.substring(5)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Campagnes d’Affiliation Actives & Brouillons</h3>
                <p className="text-xs text-slate-400">
                  Validation obligatoire des canaux autorisés et mentions légales de divulgation
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {campaigns.map((camp) => (
                <div key={camp.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{camp.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        camp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {camp.status}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        Canal: {camp.channelStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{camp.description || 'Aucune description'}</p>
                    <p className="text-[11px] text-slate-400 italic">Mention : "{camp.disclosureText}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {camp.status === 'DRAFT' && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateCampaignStatus(camp.id, 'ACTIVE')}>
                        Activer
                      </Button>
                    )}
                    {camp.status === 'ACTIVE' && (
                      <Button variant="secondary" size="sm" onClick={() => handleUpdateCampaignStatus(camp.id, 'PAUSED')}>
                        Mettre en Pause
                      </Button>
                    )}
                    {camp.status === 'PAUSED' && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateCampaignStatus(camp.id, 'ACTIVE')}>
                        Reprendre
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: LINKS */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Liens de Tracking & Redirections Sécurisées
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Campagne</th>
                    <th className="pb-2">Code Unique</th>
                    <th className="pb-2">Destination</th>
                    <th className="pb-2">Clics</th>
                    <th className="pb-2">Conversions</th>
                    <th className="pb-2 text-right">Lien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {trackingLinks.map((link) => (
                    <tr key={link.id}>
                      <td className="py-3 font-bold text-white">{link.campaign}</td>
                      <td className="py-3 font-mono text-amber-400 font-bold">{link.trackingCode}</td>
                      <td className="py-3 text-slate-400 truncate max-w-xs">{link.destinationUrl}</td>
                      <td className="py-3 font-mono text-white">{link.clicksCount}</td>
                      <td className="py-3 font-mono text-emerald-400 font-bold">{link.conversionsCount}</td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(link.trackingCode)}
                          icon={copiedCode === link.trackingCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          {copiedCode === link.trackingCode ? 'Copié' : 'Copier'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: CONVERSIONS */}
      {activeTab === 'conversions' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Conversions & Événements d'Achats Éligibles
            </h3>

            <div className="divide-y divide-slate-800">
              {conversions.map((conv) => (
                <div key={conv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{conv.externalId || conv.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {conv.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Date : {new Date(conv.occurredAt).toLocaleDateString()} | Source : {conv.source}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-white">
                      {conv.orderValue ? `$${conv.orderValue.toFixed(2)}` : 'N/A'} {conv.currency}
                    </div>
                    <div className="text-[10px] text-slate-400">Montant Commande</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: COMMISSIONS */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Historique des Commissions d'Affiliation
            </h3>

            <div className="divide-y divide-slate-800">
              {commissions.map((comm) => (
                <div key={comm.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{comm.externalId || comm.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        comm.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        comm.status === 'PAID' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {comm.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Enregistré le : {new Date(comm.createdAt).toLocaleDateString()} | Source : {comm.source}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-amber-400">
                      ${comm.commissionAmount.toFixed(2)} {comm.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Paiements & Versements Marchands Reçus
            </h3>

            <div className="divide-y divide-slate-800">
              {payouts.map((pay) => (
                <div key={pay.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{pay.externalId || pay.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {pay.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Date de versement : {pay.payoutDate ? new Date(pay.payoutDate).toLocaleDateString() : 'En attente'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">
                      ${pay.amount.toFixed(2)} {pay.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 7: CSV/JSON IMPORT CENTER */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Centre d’Importation de Rapports de Réseau (Awin / Creator Collective)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Importation sécurisée avec protection anti formule CSV et détection automatique des doublons
                </p>
              </div>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Collez votre contenu CSV (En-têtes obligatoires : external_id, order_value, commission_amount, currency, status)
                </label>
                <textarea
                  rows={5}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="external_id,order_value,commission_amount,currency,status,date&#10;AWIN_TX_1001,34.90,3.49,USD,APPROVED,2026-10-02&#10;AWIN_TX_1002,49.00,4.90,USD,PAID,2026-10-03"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="submit"
                  variant="amber"
                  disabled={isImporting || !csvContent.trim()}
                  icon={<Upload className="w-4 h-4" />}
                >
                  {isImporting ? 'Importation en cours...' : 'Valider & Importer le CSV'}
                </Button>
              </div>
            </form>

            {importResult && (
              <div className={`p-4 rounded-xl text-xs space-y-1 ${importResult.success ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300' : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'}`}>
                <div className="font-bold">
                  Résultat : {importResult.importedCount} importés | {importResult.duplicateCount} doublons | {importResult.skippedCount} ignorés
                </div>
                {importResult.errors?.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] text-rose-400 pt-1">
                    {importResult.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* New Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="max-w-md w-full p-5 space-y-4 border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Créer une Campagne d’Affiliation</h3>
              <button onClick={() => setIsCampaignModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nom de la Campagne</label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="Ex: Pinterest Spring Anime Showcase"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Plateforme Cible</label>
                <select
                  value={newCampaignPlatform}
                  onChange={(e) => setNewCampaignPlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="pinterest">Pinterest</option>
                  <option value="etsy">Etsy</option>
                  <option value="both">Multi-Canal (Both)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Mention de Transparence (Affiliate Disclosure)</label>
                <textarea
                  rows={2}
                  value={newCampaignDisclosure}
                  onChange={(e) => setNewCampaignDisclosure(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCampaignModalOpen(false)}>
                  Annuler
                </Button>
                <Button variant="amber" size="sm" type="submit">
                  Créer en Brouillon
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
