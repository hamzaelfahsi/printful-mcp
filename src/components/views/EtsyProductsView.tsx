import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Heart, 
  ShoppingBag, 
  MoreVertical, 
  Sparkles, 
  Copy, 
  PowerOff, 
  Trash2, 
  ExternalLink,
  Tag,
  CheckCircle,
  Edit,
  RefreshCw,
  AlertTriangle,
  Save,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { useI18n } from '../../i18n/I18nContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { EtsyProduct } from '../../types/index.js';

export const EtsyProductsView: React.FC = () => {
  const { 
    products, 
    duplicateProduct, 
    deactivateProduct, 
    deleteProduct, 
    showConfirmDialog, 
    setActiveTab, 
    showToast,
    isDemoMode,
    isLiveLoading,
    liveError,
    fetchLiveProducts
  } = useApp();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [selectedProduct, setSelectedProduct] = useState<EtsyProduct | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EtsyProduct | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priceAmount: 0,
    quantity: 0,
    tags: ''
  });
  const [showEditDiff, setShowEditDiff] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenEdit = (product: EtsyProduct) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description,
      priceAmount: product.priceAmount,
      quantity: product.quantity,
      tags: product.tags.join(', ')
    });
    setShowEditDiff(false);
    setIsEditModalOpen(true);
  };

  const handleSaveListing = async () => {
    if (!editingProduct) return;

    // Simulate API PATCH call /api/etsy/listing/update
    showToast({
      type: 'success',
      title: 'Listing Etsy Mis à Jour',
      message: `Le listing #${editingProduct.listingId} a été synchronisé avec succès.`
    });

    editingProduct.title = editForm.title;
    editingProduct.description = editForm.description;
    editingProduct.priceAmount = editForm.priceAmount;
    editingProduct.quantity = editForm.quantity;
    editingProduct.tags = editForm.tags.split(',').map((t) => t.trim()).filter(Boolean);
    editingProduct.lastModifiedEtsy = new Date().toISOString();

    setIsEditModalOpen(false);
  };

  const handleDeactivate = (product: EtsyProduct) => {
    showConfirmDialog({
      title: 'Désactiver le listing Etsy ?',
      message: `Voulez-vous vraiment désactiver "${product.title}" ? Le produit ne sera plus visible publiquement sur votre boutique Etsy.`,
      confirmLabel: 'Désactiver',
      confirmVariant: 'warning',
      onConfirm: () => deactivateProduct(product.id)
    });
  };

  const handleDelete = (product: EtsyProduct) => {
    showConfirmDialog({
      title: 'Supprimer définitivement le produit ?',
      message: `ATTENTION : Cette action supprimera définitivement "${product.title}" de votre catalogue Etsy. Cette opération est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      confirmVariant: 'danger',
      onConfirm: () => deleteProduct(product.id)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-amber-400" />
            <span>Gestionnaire de Produits Etsy</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {products.length} listings synchronisés via l’API Etsy v3 (Open API)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('etsy-sync')}
            icon={<RefreshCw className="w-4 h-4 text-cyan-400" />}
          >
            Diff & Synchronisation
          </Button>

          <Button
            variant="amber"
            size="sm"
            onClick={() => setActiveTab('content-generator')}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Générer Optimisations IA
          </Button>
        </div>
      </div>

      {/* Live Mode Warning / Connection Banner if needed */}
      {!isDemoMode && liveError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">Mode Live Etsy Non Connecté</h4>
              <p className="text-[11px] text-slate-300">{liveError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLiveProducts}
              disabled={isLiveLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLiveLoading ? 'animate-spin' : ''}`} />}
            >
              Réessayer
            </Button>
            <Button
              variant="amber"
              size="sm"
              onClick={() => setActiveTab('settings')}
            >
              Aller aux Paramètres
            </Button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['all', 'active', 'draft'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                statusFilter === filter
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'Tous' : filter === 'active' ? 'Actifs' : 'Brouillons'}
            </button>
          ))}
        </div>
      </Card>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Produit</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Prix</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Vues</th>
                <th className="py-3.5 px-4">Favoris</th>
                <th className="py-3.5 px-4">Ventes</th>
                <th className="py-3.5 px-4">Revenus</th>
                <th className="py-3.5 px-4">Conv.</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-850/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.primaryImageUrl}
                        alt={prod.title}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-800 shrink-0"
                      />
                      <div className="min-w-0 max-w-xs">
                        <h4
                          onClick={() => {
                            setSelectedProduct(prod);
                            setIsDetailModalOpen(true);
                          }}
                          className="font-bold text-white hover:text-amber-400 cursor-pointer truncate transition-colors"
                        >
                          {prod.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: #{prod.listingId}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={prod.status === 'active' ? 'success' : 'warning'}
                      size="sm"
                      dot
                    >
                      {prod.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    ${prod.priceAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {prod.quantity}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{prod.viewsCount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{prod.favoritesCount}</td>
                  <td className="py-3 px-4 font-bold text-emerald-400 font-mono">{prod.salesCount}</td>
                  <td className="py-3 px-4 font-bold text-white font-mono">
                    ${prod.revenueAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{prod.conversionRate}%</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        title="Modifier le listing"
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        title="Optimiser SEO & Pins"
                        onClick={() => setActiveTab('content-generator')}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        title="Dupliquer"
                        onClick={() => duplicateProduct(prod.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        title="Désactiver"
                        onClick={() => handleDeactivate(prod)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                      >
                        <PowerOff className="w-4 h-4" />
                      </button>
                      <button
                        title="Supprimer"
                        onClick={() => handleDelete(prod)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Listing Modal with BEFORE vs AFTER Diff */}
      {isEditModalOpen && editingProduct && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Modifier le Listing Etsy #${editingProduct.listingId}`}
          subtitle="Champs officiellement modifiables via PATCH /v3/application/shops/{shop_id}/listings/{listing_id}"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {!showEditDiff ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Titre du Produit</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Prix ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.priceAmount}
                      onChange={(e) => setEditForm({ ...editForm, priceAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Quantité en Stock</label>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tags Etsy (Séparés par virgule)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Description du Produit</label>
                  <textarea
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white leading-relaxed"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => setShowEditDiff(true)}
                  >
                    Vérifier les Différences Avant Enregistrement
                  </Button>
                </div>
              </>
            ) : (
              /* Diff Confirmation Review Screen */
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-3 text-xs text-slate-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">Vérification des Modifications :</strong>
                    Vérifiez les valeurs actuelles par rapport aux nouvelles valeurs avant la mise à jour officielle.
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Titre :</span>
                    <div className="line-through text-rose-400">{editingProduct.title}</div>
                    <div className="text-emerald-400 font-bold">{editForm.title}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Prix :</span>
                      <div className="line-through text-rose-400">${editingProduct.priceAmount.toFixed(2)}</div>
                      <div className="text-emerald-400 font-bold">${editForm.priceAmount.toFixed(2)}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Stock :</span>
                      <div className="line-through text-rose-400">{editingProduct.quantity}</div>
                      <div className="text-emerald-400 font-bold">{editForm.quantity}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setShowEditDiff(false)}>
                    Retour aux modifications
                  </Button>
                  <Button
                    variant="amber"
                    size="sm"
                    onClick={handleSaveListing}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Confirmer & Enregistrer sur Etsy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedProduct.title}
          subtitle={`Listing ID: #${selectedProduct.listingId}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex gap-4">
              <img
                src={selectedProduct.primaryImageUrl}
                alt=""
                className="w-32 h-32 rounded-xl object-cover border border-slate-800 shrink-0"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white font-mono">
                    ${selectedProduct.priceAmount.toFixed(2)}
                  </span>
                  <Badge variant="success" size="sm">
                    {selectedProduct.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedProduct.description}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Tags Etsy Actuels (13)</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedProduct.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Fermer
              </Button>
              <Button
                variant="amber"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setActiveTab('content-generator');
                }}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Générer Variantes de Pins
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
