import React from 'react';
import { Layers, Lock, Globe, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';

export const PinterestBoardsView: React.FC = () => {
  const { boards } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Layers className="w-6 h-6 text-purple-400" />
          <span>Tableaux Pinterest (Boards)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tableaux synchronisés pour la destination de vos épingles programmées
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {boards.map((board) => (
          <Card key={board.id} className="p-4 bg-slate-900 border-slate-800 flex items-center gap-4">
            {board.imageUrl && (
              <img
                src={board.imageUrl}
                alt={board.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white truncate">{board.name}</h4>
                <Badge variant="neutral" size="sm">
                  {board.privacy}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{board.description}</p>
              <div className="mt-2 text-[10px] font-mono text-amber-400 font-bold">
                {board.pinCount} Épingles publiées
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
