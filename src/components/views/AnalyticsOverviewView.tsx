import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  MousePointerClick, 
  ArrowUpRight,
  Pin,
  Compass,
  Calendar,
  Layers,
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  Info,
  Link as LinkIcon,
  HelpCircle,
  Lock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { 
  MetricSource, 
  VerifiedOverviewKPIs, 
  TrackingLink, 
  AttributionSummary, 
  ContentPerformanceLink 
} from '../../types/index.js';

export const AnalyticsOverviewView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'etsy' | 'pinterest' | 'content' | 'tracking' | 'insights'>('overview');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'etsy' | 'pinterest'>('all');
  
  // State from API
  const [kpis, setKpis] = useState<VerifiedOverviewKPIs | null>(null);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topPins, setTopPins] = useState<any[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [attribution, setAttribution] = useState<AttributionSummary[]>([]);
  const [contentPerformance, setContentPerformance] = useState<ContentPerformanceLink[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Detail Modals
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  
  // New Tracking Link Form
  const [newLinkUrl, setNewLinkUrl] = useState('https://etsy.com/listing/1849203941');
  const [newLinkCampaign, setNewLinkCampaign] = useState('Pinterest Spring Anime 2026');
  const [newLinkPlatform, setNewLinkPlatform] = useState<'pinterest' | 'etsy' | 'direct'>('pinterest');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, platformFilter]);

  const fetchAnalyticsData = async () => {
    try {
      const [kpiRes, tsRes, prodRes, pinRes, linkRes, attrRes, cpRes, aiRes] = await Promise.all([
        fetch('/api/analytics/overview').then((r) => r.json()),
        fetch(`/api/analytics/performance?days=${dateRange}&platform=${platformFilter}`).then((r) => r.json()),
        fetch('/api/analytics/products/top?limit=10').then((r) => r.json()),
        fetch('/api/analytics/pins/top?limit=10').then((r) => r.json()),
        fetch('/api/tracking/links').then((r) => r.json()),
        fetch('/api/attribution/summary').then((r) => r.json()),
        fetch('/api/analytics/content-performance').then((r) => r.json()),
        fetch('/api/ai/insights/recommendations').then((r) => r.json())
      ]);

      setKpis(kpiRes);
      setTimeSeries(tsRes);
      setTopProducts(prodRes);
      setTopPins(pinRes);
      setTrackingLinks(linkRes);
      setAttribution(attrRes);
      setContentPerformance(cpRes);
      setAiRecommendations(aiRes);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/analytics/sync/trigger', { method: 'POST' });
      const run = await res.json();
      setLastSyncResult(run);
      showToast({
        type: 'success',
        title: 'Synchronisation Terminée',
        message: `Données officielles rafraîchies (${run.recordsFetched} enregistrements récupérés).`
      });
      await fetchAnalyticsData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Échec de synchronisation',
        message: err?.message || 'Impossible de synchroniser avec les APIs.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTrackingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingLink(true);
    try {
      const res = await fetch('/api/tracking/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newLinkPlatform,
          destinationUrl: newLinkUrl,
          campaign: newLinkCampaign,
          source: `${newLinkPlatform}_organic`,
          medium: 'tracking_link'
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création du lien');
      }
      showToast({
        type: 'success',
        title: 'Lien de tracking généré',
        message: 'Lien sécurisé prêt à l’emploi avec protection anti open-redirect.'
      });
      await fetchAnalyticsData();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur de création',
        message: err.message
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  const renderProvenanceBadge = (source: MetricSource) => {
    switch (source) {
      case 'API_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-2.5 h-2.5" /> API Vérifiée
          </span>
        );
      case 'INTERNAL_CALCULATION':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Info className="w-2.5 h-2.5" /> Calcul Interne
          </span>
        );
      case 'AI_ESTIMATE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-2.5 h-2.5" /> Suggestion IA
          </span>
        );
      case 'API_UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Non disponible API v3
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Centre de Performance & Tracking Certifié</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Phase 6 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Collecte, normalisation et analyse des métriques officielles Etsy v3 & Pinterest v5 avec provenance vérifiée.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDateRange('7')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateRange === '7' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              7J
            </button>
            <button
              onClick={() => setDateRange('30')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateRange === '30' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              30J
            </button>
            <button
              onClick={() => setDateRange('90')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateRange === '90' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              90J
            </button>
          </div>

          <Button
            variant="amber"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            {isSyncing ? 'Synchronisation...' : 'Synchroniser Maintenant'}
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        {[
          { id: 'overview', label: 'Vue d’ensemble', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'etsy', label: 'Etsy Boutique (v3)', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
          { id: 'pinterest', label: 'Pinterest Marketing (v5)', icon: <Pin className="w-3.5 h-3.5" /> },
          { id: 'content', label: 'Impact Publications', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'tracking', label: 'Attribution & Liens', icon: <Compass className="w-3.5 h-3.5" /> },
          { id: 'insights', label: 'Recommandations IA', icon: <Sparkles className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
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
          {/* Verified KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Etsy Sales */}
            <Card className="p-4 space-y-2 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{kpis.etsySales.label}</span>
                {renderProvenanceBadge(kpis.etsySales.source)}
              </div>
              <div className="text-2xl font-black text-white">
                {kpis.etsySales.value.toLocaleString()} <span className="text-xs font-medium text-slate-400">ventes</span>
              </div>
              <p className="text-[11px] text-slate-400">{kpis.etsySales.description}</p>
            </Card>

            {/* Etsy Orders */}
            <Card className="p-4 space-y-2 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{kpis.etsyOrders.label}</span>
                {renderProvenanceBadge(kpis.etsyOrders.source)}
              </div>
              <div className="text-2xl font-black text-white">
                {kpis.etsyOrders.value.toLocaleString()} <span className="text-xs font-medium text-slate-400">commandes</span>
              </div>
              <p className="text-[11px] text-slate-400">{kpis.etsyOrders.description}</p>
            </Card>

            {/* Pinterest Impressions */}
            <Card className="p-4 space-y-2 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{kpis.pinterestImpressions.label}</span>
                {renderProvenanceBadge(kpis.pinterestImpressions.source)}
              </div>
              <div className="text-2xl font-black text-white">
                {kpis.pinterestImpressions.value.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400">{kpis.pinterestImpressions.description}</p>
            </Card>

            {/* Pinterest Outbound Clicks */}
            <Card className="p-4 space-y-2 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{kpis.pinterestOutboundClicks.label}</span>
                {renderProvenanceBadge(kpis.pinterestOutboundClicks.source)}
              </div>
              <div className="text-2xl font-black text-amber-400">
                {kpis.pinterestOutboundClicks.value.toLocaleString()} <span className="text-xs text-slate-400">visites</span>
              </div>
              <p className="text-[11px] text-slate-400">{kpis.pinterestOutboundClicks.description}</p>
            </Card>
          </div>

          {/* Performance Chart Over Time */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Évolution Quotidienne Normalisée</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Série temporelle quotidienne sans duplication ni agrégation artificielle
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Impressions Pinterest
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Clics Sortants
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Ventes Etsy
                </span>
              </div>
            </div>

            {/* Simulated Clean SVG Time-Series Chart */}
            <div className="h-64 w-full pt-4 flex flex-col justify-end">
              <div className="flex items-end gap-1.5 h-48 w-full border-b border-slate-800 pb-2">
                {timeSeries.slice(-20).map((pt, idx) => {
                  const maxImp = 8000;
                  const impHeight = Math.min(100, Math.max(15, (pt.pinterestImpressions / maxImp) * 100));
                  const clickHeight = Math.min(100, Math.max(10, (pt.pinterestOutboundClicks / 300) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-14 hidden group-hover:flex flex-col items-center bg-slate-950 border border-slate-700 p-1.5 rounded-lg text-[10px] text-white z-20 whitespace-nowrap shadow-xl">
                        <span className="font-bold text-amber-400">{pt.date}</span>
                        <span>Pinterest: {pt.pinterestImpressions} imp / {pt.pinterestOutboundClicks} clics</span>
                        <span>Etsy: {pt.etsyOrders} commandes ({pt.etsySales} ventes)</span>
                      </div>

                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        <div
                          style={{ height: `${impHeight}%` }}
                          className="w-full max-w-[8px] bg-rose-500/80 rounded-t-sm group-hover:bg-rose-400 transition-all"
                        />
                        <div
                          style={{ height: `${clickHeight}%` }}
                          className="w-full max-w-[8px] bg-amber-400/80 rounded-t-sm group-hover:bg-amber-300 transition-all"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 truncate w-full text-center">
                        {pt.date.substring(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ETSY BOUTIQUE */}
      {activeTab === 'etsy' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-400" />
                  <span>Listings Etsy & Données de Ventes Certifiées</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Classement par commandes réelles enregistrées via Etsy Open API v3
                </p>
              </div>
              <Badge variant="success">Source: Etsy API v3</Badge>
            </div>

            <div className="divide-y divide-slate-800">
              {topProducts.map((p) => (
                <div key={p.listingId} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white hover:text-amber-400 cursor-pointer" onClick={() => setSelectedListing(p)}>
                      {p.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Listing ID: <strong className="text-slate-200">{p.listingId}</strong></span>
                      <span>Prix: <strong className="text-emerald-400">${p.priceAmount.toFixed(2)}</strong></span>
                      <span>État: <strong className="text-emerald-400 uppercase">{p.state}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-sm font-black text-white">{p.ordersCount}</div>
                      <div className="text-[10px] text-slate-400">Commandes</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-amber-400">${p.revenueAmount.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">Total Ventes</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedListing(p)}>
                      Détails
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: PINTEREST MARKETING */}
      {activeTab === 'pinterest' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pin className="w-4 h-4 text-rose-400" />
                  <span>Performance Organique des Épingles</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Données certifiées par Pinterest Business API v5 (Lookback 90 jours)
                </p>
              </div>
              <Badge variant="info">Source: Pinterest API v5</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPins.map((pin) => (
                <div key={pin.pinId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <img src={pin.imageUrl} alt={pin.title} className="w-full h-36 object-cover rounded-lg" />
                  <h4 className="text-xs font-bold text-white truncate">{pin.title}</h4>
                  <div className="text-[11px] text-slate-400">Tableau: {pin.boardName}</div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center">
                    <div>
                      <div className="text-xs font-bold text-white">{pin.impressions.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400">Impressions</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-rose-400">{pin.saves.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400">Saves</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-400">{pin.outboundClicks.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400">Clics</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PUBLICATION IMPACT */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Performance Observée après Publication</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Liaison entre les tâches publiées en Phase 5 et les métriques observées ultérieurement
                </p>
              </div>
              <Badge variant="neutral">Attribution Neutre</Badge>
            </div>

            <div className="divide-y divide-slate-800">
              {contentPerformance.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                        {item.platform}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Publié le : {new Date(item.publishedAt).toLocaleDateString()}</span>
                      <span>External ID : <strong className="text-slate-200">{item.externalId}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    {item.observedMetrics.impressions !== undefined && (
                      <div>
                        <span className="text-xs font-bold text-white">{item.observedMetrics.impressions}</span>
                        <div className="text-[9px] text-slate-400">Impressions</div>
                      </div>
                    )}
                    {item.observedMetrics.outboundClicks !== undefined && (
                      <div>
                        <span className="text-xs font-bold text-amber-400">{item.observedMetrics.outboundClicks}</span>
                        <div className="text-[9px] text-slate-400">Clics</div>
                      </div>
                    )}
                    {renderProvenanceBadge(item.provenance)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: TRACKING & ATTRIBUTION */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Tracking Link Generator */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-amber-400" />
              <span>Générateur de Liens de Tracking First-Party</span>
            </h3>

            <form onSubmit={handleCreateTrackingLink} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">URL de Destination (Vérifiée)</label>
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Campagne</label>
                <input
                  type="text"
                  value={newLinkCampaign}
                  onChange={(e) => setNewLinkCampaign(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="amber"
                  className="w-full"
                  disabled={isCreatingLink}
                >
                  {isCreatingLink ? 'Création...' : 'Créer le Lien'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Attribution Table */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Attribution & Performance des Campagnes</h3>
                <p className="text-xs text-slate-400">
                  Séparation stricte : Clics ≠ Conversions ≠ Commissions
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Dimension / Campagne</th>
                    <th className="pb-2">Clics Enregistrés</th>
                    <th className="pb-2">Conversions</th>
                    <th className="pb-2">Taux Conv.</th>
                    <th className="pb-2">Commission Est.</th>
                    <th className="pb-2">Statut Attribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {attribution.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-bold text-white">{row.dimension}</td>
                      <td className="py-2.5">{row.clicks}</td>
                      <td className="py-2.5 text-emerald-400 font-bold">{row.conversions}</td>
                      <td className="py-2.5">{row.conversionRate}%</td>
                      <td className="py-2.5 font-bold text-amber-400">${row.commission.toFixed(2)}</td>
                      <td className="py-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: AI INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Recommandations IA Groundées sur Données Vérifiées</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Analyse des tendances réelles avec ancrage factuel strict (aucun chiffre inventé)
                </p>
              </div>
              <Badge variant="warning">RECOMMANDATIONS IA</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiRecommendations.map((rec) => (
                <div key={rec.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {rec.type}
                    </span>
                    <span className="text-[10px] text-slate-400">Source: Recommandation IA</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
                  <div className="pt-2 border-t border-slate-900 text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Action suggérée : {rec.suggestedAction}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="max-w-md w-full p-5 space-y-4 border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Détail du Listing Etsy #{selectedListing.listingId}</h3>
              <button onClick={() => setSelectedListing(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <p><strong className="text-white">Titre :</strong> {selectedListing.title}</p>
              <p><strong className="text-white">Prix unitaire :</strong> ${selectedListing.priceAmount?.toFixed(2)}</p>
              <p><strong className="text-white">Commandes vérifiées :</strong> {selectedListing.ordersCount}</p>
              <p><strong className="text-white">Total Ventes :</strong> ${selectedListing.revenueAmount?.toFixed(2)}</p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-slate-200">Provenance :</span> Etsy Open API v3 (Commandes & Reçus vérifiés). Les vues détaillées ne sont pas exposées par l'API v3 publique.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedListing(null)}>
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
