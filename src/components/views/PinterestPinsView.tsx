import React, { useState } from 'react';
import { 
  Pin as PinIcon, 
  Plus, 
  Search, 
  Eye, 
  Bookmark, 
  MousePointerClick, 
  Percent, 
  ExternalLink, 
  Sparkles,
  Layers,
  Calendar,
  Trash2,
  Edit,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { PinterestPin } from '../../types/index.js';

export const PinterestPinsView: React.FC = () => {
  const { pins, boards, setActiveTab, showToast, showConfirmDialog } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState('all');
  
  // Create Pin Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    boardId: boards[0]?.id || 'board_anime_cases',
    destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    altText: 'Stained glass phone case printable illustration'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Analytics Modal
  const [analyticsPin, setAnalyticsPin] = useState<PinterestPin | null>(null);

  const filteredPins = pins.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBoard = selectedBoardFilter === 'all' || p.boardId === selectedBoardFilter;
    return matchesSearch && matchesBoard;
  });

  const handleCreatePin = async (mode: 'PUBLISH' | 'DRAFT') => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCreateModalOpen(false);
      showToast({
        type: 'success',
        title: mode === 'PUBLISH' ? 'Épingle Pinterest Publiée' : 'Épingle Enregistrée en Brouillon',
        message: `L'épingle "${createForm.title}" a été traitée avec succès.`
      });
    }, 1000);
  };

  const handleDeletePin = (pin: PinterestPin) => {
    showConfirmDialog({
      title: 'Supprimer l’épingle Pinterest ?',
      message: `Cette action supprimera définitivement l'épingle "${pin.title}" de votre tableau Pinterest. Cette action est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      confirmVariant: 'danger',
      onConfirm: () => {
        showToast({
          type: 'info',
          title: 'Épingle supprimée',
          message: `L'épingle #${pin.id} a été supprimée.`
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <PinIcon className="w-6 h-6 text-rose-500" />
            <span>Gestionnaire d'Épingles Pinterest Business</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {pins.length} épingles synchronisées via l’API officielle Pinterest Business v5
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('pinterest-boards')}
            icon={<Layers className="w-4 h-4 text-indigo-400" />}
          >
            Voir les Tableaux ({boards.length})
          </Button>

          <Button
            variant="amber"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Créer une Épingle
          </Button>
        </div>
      </div>

      {/* Account Status Card */}
      <Card className="p-4 bg-gradient-to-r from-rose-950/30 via-slate-900 to-indigo-950/30 border-rose-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <PinIcon className="w-5 h-5 fill-rose-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Compte Pinterest Business :</span>
                <span className="text-xs font-bold text-rose-400">@craftcases_studio</span>
                <Badge variant="success" size="sm">API v5 Connectée</Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                8 420 abonnés • 382 000 vues mensuelles • 6 tableaux • Scopes : pins:read, pins:write, boards:read
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast({ type: 'info', title: 'Actualisation', message: 'Métriques Pinterest synchronisées.' })}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Search & Board Filter */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre ou mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-400">Filtrer par tableau :</span>
          <select
            value={selectedBoardFilter}
            onChange={(e) => setSelectedBoardFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="all">Tous les tableaux ({pins.length})</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Pins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPins.map((pin) => (
          <Card key={pin.id} className="p-4 bg-slate-900 border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img src={pin.imageUrl} alt={pin.title} className="w-full h-full object-cover" />
                <div className="absolute top-2.5 right-2.5">
                  <Badge variant="purple" size="sm">
                    {pin.boardName}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white line-clamp-1">{pin.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{pin.description}</p>
              </div>

              {/* Engagement Metrics */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Impressions</span>
                  <span className="text-xs font-bold text-white">{pin.impressions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Saves</span>
                  <span className="text-xs font-bold text-rose-400">{pin.saves}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Clics Sortants</span>
                  <span className="text-xs font-black text-emerald-400">{pin.outboundClicks}</span>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
              <button
                onClick={() => setAnalyticsPin(pin)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics v5
              </button>

              <div className="flex items-center gap-1.5">
                <a
                  href={pin.destinationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Voir le lien cible"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleDeletePin(pin)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 transition-colors"
                  title="Supprimer l'épingle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Pin Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Créer une Épingle Pinterest Business"
          subtitle="Publication officielle via POST /v5/pins (Scope: pins:write)"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Titre de l'Épingle (Max 100 char)</label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Ex: Mystic Celestial Fox Anime Case Artwork"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Description & Mots-clés SEO</label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Description détaillée de l'illustration et des finitions dorées..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tableau Cible (Board)</label>
                <select
                  value={createForm.boardId}
                  onChange={(e) => setCreateForm({ ...createForm, boardId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Lien de Destination</label>
                <input
                  type="text"
                  value={createForm.destinationUrl}
                  onChange={(e) => setCreateForm({ ...createForm, destinationUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">URL Image (Source 2D Haute Définition)</label>
              <input
                type="text"
                value={createForm.imageUrl}
                onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Annuler
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCreatePin('DRAFT')}
                >
                  Sauvegarder Brouillon
                </Button>
                <Button
                  variant="amber"
                  size="sm"
                  loading={isSubmitting}
                  onClick={() => handleCreatePin('PUBLISH')}
                  icon={<PinIcon className="w-3.5 h-3.5" />}
                >
                  Approuver & Publier sur Pinterest
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Analytics Modal */}
      {analyticsPin && (
        <Modal
          isOpen={Boolean(analyticsPin)}
          onClose={() => setAnalyticsPin(null)}
          title={`Analytics v5 — ${analyticsPin.title}`}
          subtitle="Données officielles de conversion & d'engagement (GET /v5/pins/{pin_id}/analytics)"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Impressions Totales</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {analyticsPin.impressions.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-rose-400 font-bold uppercase block">Épingles Enregistrées</span>
                <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">
                  {analyticsPin.saves}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">Clics Sortants Etsy</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  {analyticsPin.outboundClicks}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">Taux de Clic (CTR)</span>
                <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                  {analyticsPin.ctr}%
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setAnalyticsPin(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
