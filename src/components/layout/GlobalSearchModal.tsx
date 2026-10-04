import React, { useState } from 'react';
import { Search, Package, Pin, ShoppingBag, Link2, Sparkles, X, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Modal } from '../common/Modal.js';
import { Badge } from '../common/Badge.js';

export const GlobalSearchModal: React.FC = () => {
  const { isGlobalSearchOpen, setIsGlobalSearchOpen, products, pins, orders, affiliateLinks, setActiveTab } = useApp();
  const [query, setQuery] = useState('');

  if (!isGlobalSearchOpen) return null;

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredPins = pins.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.boardName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.buyerName.toLowerCase().includes(query.toLowerCase()) ||
    o.receiptId.toString().includes(query)
  );

  const filteredAffiliate = affiliateLinks.filter(a =>
    a.campaignName.toLowerCase().includes(query.toLowerCase()) ||
    a.trackingCode.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (tab: any) => {
    setActiveTab(tab);
    setIsGlobalSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => setIsGlobalSearchOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Rechercher produits Etsy, épingles Pinterest, commandes, campagnes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Products */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Package className="w-3.5 h-3.5" />
                <span>Produits Etsy ({filteredProducts.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {filteredProducts.slice(0, 3).map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelect('etsy-products')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={product.primaryImageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                          {product.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">${product.priceAmount.toFixed(2)} • {product.viewsCount} vues • {product.salesCount} ventes</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pinterest Pins */}
          {filteredPins.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Pin className="w-3.5 h-3.5" />
                <span>Épingles Pinterest ({filteredPins.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {filteredPins.slice(0, 2).map((pin) => (
                  <div
                    key={pin.id}
                    onClick={() => handleSelect('pinterest-pins')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={pin.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                          {pin.title}
                        </h4>
                        <span className="text-[10px] text-slate-400">{pin.boardName} • {pin.impressions.toLocaleString()} impressions</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {filteredOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Commandes ({filteredOrders.length})</span>
              </div>
              <div className="space-y-1 mt-1">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleSelect('etsy-orders')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors group"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                        Reçu #{order.receiptId} — {order.buyerName}
                      </h4>
                      <span className="text-[10px] text-slate-400">${order.totalAmount.toFixed(2)} • {order.itemsCount} article(s)</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && filteredPins.length === 0 && filteredOrders.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              Aucun résultat correspondant pour "{query}"
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Naviguer avec ↑ ↓ • Sélectionner avec Entrée</span>
          <span>Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
};
