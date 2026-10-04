import React from 'react';
import { ShoppingBag, CheckCircle, Truck, DollarSign, Calendar, User } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';

export const EtsyOrdersView: React.FC = () => {
  const { orders } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ShoppingBag className="w-6 h-6 text-indigo-400" />
          <span>Commandes Etsy</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Suivi des transactions et reçus récents synchronisés via l’API Etsy
        </p>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="p-4 bg-slate-900 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Reçu #{order.receiptId}</span>
                    <span className="text-slate-400 font-normal">• {order.buyerName}</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant={order.status === 'shipped' ? 'info' : 'success'}
                  size="sm"
                  dot
                >
                  {order.status === 'shipped' ? 'Expédiée' : 'Payée & Validée'}
                </Badge>
                <span className="text-base font-black text-white font-mono">
                  ${order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {order.itemsSummary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">
                    {item.quantity}x {item.title}
                  </span>
                  <span className="text-slate-400 font-mono font-semibold">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
