import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Bot, 
  RefreshCw, 
  Layers, 
  FlaskConical, 
  ShieldCheck, 
  ArrowUpRight, 
  Info, 
  Plus, 
  Filter,
  Check,
  X,
  Clock,
  Eye,
  Bookmark
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { 
  AIInsightV2, 
  AIInsightType, 
  AIInsightSeverity, 
  AIInsightConfidence, 
  AIInsightStatus,
  AIExperiment,
  AIExperimentVariable
} from '../../types/index.js';

export const AIInsightsView: React.FC = () => {
  const { setActiveTab, showToast } = useApp();
  const [activeTabSub, setActiveTabSub] = useState<'overview' | 'performance' | 'seo' | 'content' | 'monetization' | 'experiments' | 'quality'>('overview');
  
  const [insights, setInsights] = useState<AIInsightV2[]>([]);
  const [experiments, setExperiments] = useState<AIExperiment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filter state
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Experiment Modal
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expName, setExpName] = useState('');
  const [expHypothesis, setExpHypothesis] = useState('');
  const [expPlatform, setExpPlatform] = useState<'etsy' | 'pinterest'>('pinterest');
  const [expVariable, setExpVariable] = useState<AIExperimentVariable>('TITLE');
  const [expControl, setExpControl] = useState('');
  const [expVariant, setExpVariant] = useState('');
  const [expMetric, setExpMetric] = useState('outbound_clicks');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [insRes, expRes] = await Promise.all([
        fetch('/api/ai/insights/v2').then((r) => r.json()),
        fetch('/api/ai/experiments').then((r) => r.json())
      ]);
      setInsights(insRes);
      setExperiments(expRes);
    } catch (e) {
      console.error('Error fetching AI insights/experiments:', e);
    }
  };

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/insights/v2/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Échec de la génération des diagnostics');
      const data = await res.json();
      showToast({
        type: 'success',
        title: 'Diagnostics IA Actualisés',
        message: `${data.generatedCount} observations vérifiées et étayées ont été générées.`
      });
      await fetchData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erreur', message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateInsightStatus = async (id: string, status: AIInsightStatus) => {
    try {
      await fetch(`/api/ai/insights/v2/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showToast({ type: 'info', title: `Insight marqué comme ${status}` });
      await fetchData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erreur', message: err.message });
    }
  };

  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim()) return;

    try {
      const res = await fetch('/api/ai/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: expName,
          hypothesis: expHypothesis,
          platform: expPlatform,
          contentType: 'pin',
          variable: expVariable,
          control: expControl,
          variant: expVariant,
          successMetric: expMetric
        })
      });
      if (!res.ok) throw new Error('Erreur création expérience');
      showToast({
        type: 'success',
        title: 'Expérience A/B Enregistrée',
        message: 'L’expérience est créée à l’état DRAFT. Prête pour publication via le workflow d’approbation.'
      });
      setIsExpModalOpen(false);
      setExpName('');
      setExpHypothesis('');
      setExpControl('');
      setExpVariant('');
      await fetchData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erreur', message: err.message });
    }
  };

  // Filtered insights
  const filteredInsights = insights.filter((i) => {
    if (filterPlatform !== 'all' && i.platform !== filterPlatform && i.platform !== 'all') return false;
    if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false;
    if (activeTabSub === 'performance' && i.type !== 'PERFORMANCE_CHANGE' && i.type !== 'ANOMALY') return false;
    if (activeTabSub === 'seo' && i.type !== 'SEO_OPPORTUNITY') return false;
    if (activeTabSub === 'content' && i.type !== 'CONTENT_OPPORTUNITY' && i.type !== 'CONTENT_RECOMMENDATION') return false;
    if (activeTabSub === 'monetization' && i.type !== 'MONETIZATION_OPPORTUNITY' && i.type !== 'CONVERSION_OPPORTUNITY') return false;
    if (activeTabSub === 'quality' && i.type !== 'DATA_QUALITY' && i.type !== 'SYNC_WARNING') return false;
    return true;
  });

  const getSeverityBadge = (sev: AIInsightSeverity) => {
    switch (sev) {
      case 'HIGH':
        return <Badge variant="danger">Priorité Haute</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Priorité Moyenne</Badge>;
      case 'LOW':
        return <Badge variant="info">Priorité Basse</Badge>;
      default:
        return <Badge variant="neutral">Information</Badge>;
    }
  };

  const getConfidenceBadge = (conf: AIInsightConfidence) => {
    switch (conf) {
      case 'HIGH':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Confiance Élevée (14+ pts)</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Confiance Moyenne (7-13 pts)</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">Confiance Basse (&lt;7 pts)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Centre d’Analyses & Diagnostics IA</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Phase 8 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Recommandations déterministes et explicables, étayées par des données vérifiées (Etsy + Pinterest + Monétisation).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            icon={<RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />}
          >
            {isGenerating ? 'Analyse en cours...' : 'Actualiser les Diagnostics'}
          </Button>

          <Button
            variant="amber"
            size="sm"
            onClick={() => setIsExpModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Nouvelle Expérience A/B
          </Button>
        </div>
      </div>

      {/* Trust & Provenance Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <strong className="text-white block font-semibold">Modèle de Confiance & Zéro Hallucination :</strong>
          <p>
            Chaque recommandation est validée mathématiquement par le <em>ClaimValidator</em> avant affichage. Les métriques non disponibles (ex: vues temps réel) sont explicitement étiquetées <code>API_UNAVAILABLE</code> et ne sont jamais interprétées comme zéro ou simulées.
          </p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        {[
          { id: 'overview', label: 'Tous les Diagnostics', icon: <Lightbulb className="w-3.5 h-3.5" /> },
          { id: 'performance', label: 'Performance & Tendances', icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { id: 'seo', label: 'SEO & Tags', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'content', label: 'Contenu & Visuels', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'monetization', label: 'Monétisation', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
          { id: 'experiments', label: 'Laboratoire A/B', icon: <FlaskConical className="w-3.5 h-3.5" /> },
          { id: 'quality', label: 'Qualité des Données', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabSub(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTabSub === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: EXPERIMENTS */}
      {activeTabSub === 'experiments' ? (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <span>Laboratoire d'Expérimentations A/B</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Comparez rigoureusement variantes de titres, visuels ou mots-clés sans publication automatique
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {experiments.map((exp) => (
                <div key={exp.id} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{exp.name}</span>
                      <Badge variant="purple">{exp.platform}</Badge>
                      <Badge variant="info">Variable: {exp.variable}</Badge>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {exp.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Échantillon : <strong className="text-white">{exp.sampleSize}</strong> observations
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic">Hypothèse : "{exp.hypothesis}"</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[11px] font-bold text-slate-400 mb-1">Contrôle (A)</div>
                      <div className="text-xs text-white font-mono truncate">{exp.control}</div>
                      {exp.controlMetricValue !== undefined && (
                        <div className="text-xs font-bold text-slate-300 mt-2">
                          Métrique : {exp.controlMetricValue} ({exp.successMetric})
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[11px] font-bold text-amber-400 mb-1">Variante (B)</div>
                      <div className="text-xs text-white font-mono truncate">{exp.variant}</div>
                      {exp.variantMetricValue !== undefined && (
                        <div className="text-xs font-bold text-emerald-400 mt-2 flex items-center justify-between">
                          <span>Métrique : {exp.variantMetricValue} ({exp.successMetric})</span>
                          {exp.differencePercent !== undefined && (
                            <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">
                              {exp.differencePercent > 0 ? '+' : ''}{exp.differencePercent}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        /* INSIGHTS CARDS */
        <div className="space-y-4">
          {filteredInsights.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 space-y-2">
              <Info className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">Aucun diagnostic ne correspond aux filtres sélectionnés.</p>
              <p className="text-xs">Cliquez sur « Actualiser les Diagnostics » pour recalculer les tendances.</p>
            </Card>
          ) : (
            filteredInsights.map((insight) => (
              <Card key={insight.id} className="p-5 bg-slate-900 border-slate-800 space-y-4">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(insight.severity)}
                      {getConfidenceBadge(insight.confidence)}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                        {insight.platform}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {insight.type}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white pt-1">{insight.title}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {insight.status === 'NEW' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateInsightStatus(insight.id, 'SAVED')}
                        icon={<Bookmark className="w-3.5 h-3.5" />}
                      >
                        Sauvegarder
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdateInsightStatus(insight.id, 'DISMISSED')}
                      icon={<X className="w-3.5 h-3.5" />}
                    >
                      Masquer
                    </Button>
                  </div>
                </div>

                {/* Explainability Section */}
                <div className="space-y-3 text-xs">
                  {/* Summary & Explanation */}
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium">{insight.summary}</p>
                    <p className="text-slate-400 text-[11px]">{insight.explanation}</p>
                  </div>

                  {/* Evidence Breakdown */}
                  {insight.evidence && insight.evidence.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Preuves & Données Source Vérifiées :</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {insight.evidence.map((ev, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-0.5">
                            <div className="font-bold text-white">{ev.label}</div>
                            <div className="text-slate-300 flex items-center justify-between">
                              <span>Valeur : <strong className="text-amber-400">{ev.currentValue !== undefined ? ev.currentValue : 'N/A'}</strong></span>
                              {ev.changePercent !== undefined && (
                                <span className={`font-bold ${ev.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {ev.changePercent > 0 ? '+' : ''}{ev.changePercent}%
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Source : <span className="font-mono text-slate-300">{ev.source}</span> {ev.period ? `(${ev.period})` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation & Action */}
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 block mb-0.5">Suggestion d'Action :</span>
                      <p className="text-slate-300 text-[11px]">{insight.recommendation}</p>
                    </div>

                    <Button
                      variant="amber"
                      size="sm"
                      onClick={() => setActiveTab('content-generator')}
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      Créer un Brouillon
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal New Experiment */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="max-w-md w-full p-5 space-y-4 border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-400" />
                <span>Créer une Expérience A/B</span>
              </h3>
              <button onClick={() => setIsExpModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExperiment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nom du Test</label>
                <input
                  type="text"
                  required
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Ex: Test Accroche Vitrail vs Dragon"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Hypothèse</label>
                <textarea
                  rows={2}
                  required
                  value={expHypothesis}
                  onChange={(e) => setExpHypothesis(e.target.value)}
                  placeholder="Ex: Mentionner les reflets d'or augmente le taux de clic"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Plateforme</label>
                  <select
                    value={expPlatform}
                    onChange={(e) => setExpPlatform(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="pinterest">Pinterest</option>
                    <option value="etsy">Etsy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Variable Testée</label>
                  <select
                    value={expVariable}
                    onChange={(e) => setExpVariable(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="TITLE">Titre</option>
                    <option value="DESCRIPTION">Description</option>
                    <option value="TAGS">Tags</option>
                    <option value="KEYWORDS">Mots-clés</option>
                    <option value="IMAGE_STYLE">Style Visuel</option>
                    <option value="CTA">Call to Action</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Contrôle (A)</label>
                <input
                  type="text"
                  required
                  value={expControl}
                  onChange={(e) => setExpControl(e.target.value)}
                  placeholder="Ex: Japanese Celestial Dragon Phone Case"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Variante (B)</label>
                <input
                  type="text"
                  required
                  value={expVariant}
                  onChange={(e) => setExpVariant(e.target.value)}
                  placeholder="Ex: ✨ Gold Foil Celestial Dragon Case | Anime Art"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsExpModalOpen(false)}>
                  Annuler
                </Button>
                <Button variant="amber" size="sm" type="submit">
                  Enregistrer en Brouillon
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
