import React, { useState } from 'react';
import { 
  ListOrdered, 
  CheckCircle, 
  CalendarClock, 
  Send, 
  Trash2, 
  Sparkles, 
  ExternalLink,
  Clock,
  Pin,
  Tag
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { useI18n } from '../../i18n/I18nContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { ContentItem } from '../../types/index.js';

export const ContentQueueView: React.FC = () => {
  const { 
    contentQueue, 
    approveContentItem, 
    scheduleContentItem, 
    publishContentItem, 
    deleteContentItem, 
    showConfirmDialog,
    setActiveTab 
  } = useApp();
  const { t } = useI18n();

  const [scheduleModalItem, setScheduleModalItem] = useState<ContentItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('2026-10-05T14:00');

  const handlePublishNow = (item: ContentItem) => {
    showConfirmDialog({
      title: 'Confirmer la publication en direct ?',
      message: `Êtes-vous sûr de vouloir publier immédiatement ce contenu sur ${item.targetPlatform === 'pinterest' ? 'Pinterest' : 'Etsy'} ? Il sera visible instantanément par votre audience.`,
      confirmLabel: 'Approuver & Publier',
      confirmVariant: 'primary',
      onConfirm: () => publishContentItem(item.id)
    });
  };

  const handleDeleteItem = (item: ContentItem) => {
    showConfirmDialog({
      title: 'Supprimer ce contenu de la file ?',
      message: `Voulez-vous retirer "${item.title}" de votre file d’attente ?`,
      confirmLabel: 'Supprimer',
      confirmVariant: 'danger',
      onConfirm: () => deleteContentItem(item.id)
    });
  };

  const handleConfirmSchedule = () => {
    if (scheduleModalItem) {
      scheduleContentItem(scheduleModalItem.id, new Date(scheduleDate).toISOString());
      setScheduleModalItem(null);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ready':
        return 'warning';
      case 'approved':
        return 'primary';
      case 'scheduled':
        return 'info';
      case 'published':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-amber-400" />
            <span>File d'Attente & Workflow d'Approbation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chaque publication nécessite votre validation explicite avant diffusion publique
          </p>
        </div>

        <Button
          variant="amber"
          size="sm"
          onClick={() => setActiveTab('content-generator')}
          icon={<Sparkles className="w-4 h-4" />}
        >
          Créer Nouveau Contenu
        </Button>
      </div>

      {/* Queue items */}
      <div className="space-y-4">
        {contentQueue.length === 0 ? (
          <Card className="text-center py-16 text-slate-500 space-y-3">
            <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
            <h3 className="text-sm font-bold text-white">File d'attente vide</h3>
            <p className="text-xs max-w-sm mx-auto">
              Tous vos contenus ont été validés et traités. Utilisez le générateur IA pour préparer vos prochaines publications.
            </p>
          </Card>
        ) : (
          contentQueue.map((item) => (
            <Card key={item.id} className="p-5 bg-slate-900 border-slate-800">
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Visual Thumbnail */}
                <div className="relative w-full lg:w-44 aspect-video lg:aspect-[9/13] rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2">
                    <Badge variant={statusVariant(item.status)} size="sm" dot>
                      {item.status}
                    </Badge>
                  </div>
                </div>

                {/* Main Content Details */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="purple" size="sm">
                        {item.targetPlatform.toUpperCase()}
                      </Badge>
                      {item.targetBoardName && (
                        <span className="text-slate-400 text-[11px]">
                          Tableau : <strong className="text-slate-200">{item.targetBoardName}</strong>
                        </span>
                      )}
                      {item.productTitle && (
                        <span className="text-slate-500 text-[11px] truncate max-w-xs">
                          • Produit lié : {item.productTitle}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.keywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.scheduledDate ? (
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Prévu le : {new Date(item.scheduledDate).toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <span>Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                        className="text-rose-400 hover:text-rose-300"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Supprimer
                      </Button>

                      {item.status === 'ready' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => approveContentItem(item.id)}
                          icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        >
                          Approuver
                        </Button>
                      )}

                      {(item.status === 'ready' || item.status === 'approved') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScheduleModalItem(item)}
                          icon={<CalendarClock className="w-3.5 h-3.5 text-cyan-400" />}
                        >
                          Programmer
                        </Button>
                      )}

                      {item.status !== 'published' && (
                        <Button
                          variant="amber"
                          size="sm"
                          onClick={() => handlePublishNow(item)}
                          icon={<Send className="w-3.5 h-3.5" />}
                        >
                          Approuver & Publier
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModalItem && (
        <Modal
          isOpen={!!scheduleModalItem}
          onClose={() => setScheduleModalItem(null)}
          title="Programmer la publication"
          subtitle={`Pour : ${scheduleModalItem.title}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Date et Heure de diffusion
              </label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Le job scheduler publiera automatiquement ce contenu à l’heure fixée via les API officielles.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setScheduleModalItem(null)}>
                Annuler
              </Button>
              <Button variant="amber" size="sm" onClick={handleConfirmSchedule}>
                Enregistrer la Programmation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
