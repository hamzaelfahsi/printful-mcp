import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Send, 
  RotateCcw, 
  XCircle, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Pin as PinIcon, 
  ShoppingBag, 
  Plus, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { PublicationTask, PublicationStatus } from '../../../server/services/PublicationWorker.js';

export const PublicationCenterView: React.FC = () => {
  const { products, showToast, showConfirmDialog } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'calendar'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Publication Tasks
  const [tasks, setTasks] = useState<PublicationTask[]>([
    {
      id: 'pub_1',
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_dragon_01',
      contentVersionId: 'content_v1',
      title: 'Celestial Dragon Stained Glass Art Phone Case',
      description: 'Handcrafted phone case featuring mystical celestial dragon in Art Nouveau style with gold foil accents.',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
      destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
      boardId: 'board_anime_cases',
      scheduledAt: new Date(Date.now() + 3600000 * 4).toISOString(), // in 4 hours
      status: 'SCHEDULED',
      idempotencyKey: 'idemp_pinterest_prod_dragon_01_v1_01',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'pub_2',
      platform: 'etsy',
      accountId: 'etsy_user_default',
      contentId: 'prod_dragon_01',
      contentVersionId: 'content_v1',
      title: 'Japanese Celestial Dragon Phone Case — Stained Glass Art Nouveau Cover',
      description: 'Embrace the mythic power of the celestial dragon with this handcrafted aesthetic phone case.',
      listingId: 1849203941,
      scheduledAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'PUBLISHED',
      idempotencyKey: 'idemp_etsy_prod_dragon_01_v1_02',
      attempts: 1,
      maxAttempts: 3,
      externalId: '1849203941',
      createdAt: new Date(Date.now() - 90000000).toISOString(),
      publishedAt: new Date(Date.now() - 86390000).toISOString()
    },
    {
      id: 'pub_3',
      platform: 'pinterest',
      accountId: 'pin_acc_92837482',
      contentId: 'prod_kitsune_02',
      contentVersionId: 'content_v2',
      title: 'Mystic Kitsune Fox Deity Art Nouveau Case',
      description: 'Enchanted fox spirit illustration with glowing celestial background.',
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
      boardId: 'board_anime_cases',
      scheduledAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'PUBLISHED',
      idempotencyKey: 'idemp_pinterest_prod_kitsune_02_v2_03',
      attempts: 1,
      maxAttempts: 3,
      externalId: 'pin_99882211',
      createdAt: new Date(Date.now() - 10000000).toISOString(),
      publishedAt: new Date(Date.now() - 7190000).toISOString()
    }
  ]);

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    platform: 'pinterest' as 'etsy' | 'pinterest',
    productTitle: products[0]?.title || '',
    description: 'Aesthetic stained glass artwork phone cover.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    destinationUrl: 'https://etsy.com/shop/CraftCasesStudio',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTime: '18:00'
  });

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || t.platform === platformFilter;
    return matchesStatus && matchesPlatform;
  });

  const handlePublishNow = (task: PublicationTask) => {
    showConfirmDialog({
      title: 'Publier immédiatement ?',
      message: `Cette action déclenchera la publication directe de "${task.title}" sur ${task.platform.toUpperCase()} via l'API officielle.`,
      confirmLabel: 'Publier maintenant',
      confirmVariant: 'warning',
      onConfirm: () => {
        // Transition to PUBLISHING -> PUBLISHED
        setTasks(
          tasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'PUBLISHED',
                  publishedAt: new Date().toISOString(),
                  externalId: task.platform === 'pinterest' ? `pin_${Date.now()}` : '1849203941'
                }
              : t
          )
        );
        showToast({
          type: 'success',
          title: 'Publication Réussie',
          message: `Le contenu est désormais en ligne sur ${task.platform.toUpperCase()}.`
        });
      }
    });
  };

  const handleCancelTask = (task: PublicationTask) => {
    showConfirmDialog({
      title: 'Annuler la programmation ?',
      message: `Êtes-vous sûr de vouloir annuler la publication de "${task.title}" ?`,
      confirmLabel: 'Confirmer l’annulation',
      confirmVariant: 'danger',
      onConfirm: () => {
        setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: 'CANCELLED' } : t)));
        showToast({
          type: 'info',
          title: 'Publication Annulée',
          message: 'La tâche a été retirée de la file d’attente.'
        });
      }
    });
  };

  const handleCreateSchedule = () => {
    const combinedUtc = new Date(`${scheduleForm.scheduledDate}T${scheduleForm.scheduledTime}:00Z`);
    const newTask: PublicationTask = {
      id: `pub_${Date.now()}`,
      platform: scheduleForm.platform,
      accountId: scheduleForm.platform === 'etsy' ? 'etsy_user_default' : 'pin_acc_92837482',
      contentId: `prod_${Date.now()}`,
      contentVersionId: 'content_v1',
      title: scheduleForm.productTitle,
      description: scheduleForm.description,
      imageUrl: scheduleForm.imageUrl,
      destinationUrl: scheduleForm.destinationUrl,
      scheduledAt: combinedUtc.toISOString(),
      status: 'SCHEDULED',
      idempotencyKey: `idemp_${scheduleForm.platform}_${Date.now()}`,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString()
    };

    setTasks([newTask, ...tasks]);
    setIsScheduleModalOpen(false);
    showToast({
      type: 'success',
      title: 'Publication Programmée',
      message: `Enregistrée pour le ${combinedUtc.toLocaleDateString()} à ${scheduleForm.scheduledTime} (UTC).`
    });
  };

  const getStatusBadge = (status: PublicationStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success" size="sm" dot>Publié</Badge>;
      case 'SCHEDULED':
        return <Badge variant="warning" size="sm" dot>Programmé</Badge>;
      case 'PUBLISHING':
        return <Badge variant="purple" size="sm" dot>En cours...</Badge>;
      case 'FAILED':
        return <Badge variant="danger" size="sm" dot>Échoué</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" size="sm">Annulé</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-amber-400" />
            <span>Publication & Scheduler Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Orchestration multi-canaux Etsy & Pinterest avec protection d'idempotence et validation humaine stricte
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSubTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'queue' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              File de Publication ({tasks.length})
            </button>
            <button
              onClick={() => setActiveSubTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'calendar' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendrier
            </button>
          </div>

          <Button
            variant="amber"
            size="sm"
            onClick={() => setIsScheduleModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Programmer
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5 bg-slate-900 border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300">Filtres :</span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="SCHEDULED">Programmés</option>
            <option value="PUBLISHED">Publiés</option>
            <option value="FAILED">Échoués</option>
            <option value="CANCELLED">Annulés</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="all">Toutes plateformes</option>
            <option value="etsy">Etsy</option>
            <option value="pinterest">Pinterest</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Fuseau horaire : <span className="text-amber-400 font-bold">UTC (Stockage) / Heure Locale (Affichage)</span>
        </div>
      </Card>

      {/* MAIN CONTENT: QUEUE OR CALENDAR */}
      {activeSubTab === 'queue' ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-4 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {task.platform === 'pinterest' ? (
                      <PinIcon className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{task.title}</span>
                      {getStatusBadge(task.status)}
                      <Badge variant="neutral" size="sm" className="font-mono">
                        {task.platform.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                      <span>Prévu le : <strong className="text-slate-300">{new Date(task.scheduledAt).toLocaleString()}</strong></span>
                      {task.externalId && (
                        <span>ID Externe : <strong className="text-emerald-400">{task.externalId}</strong></span>
                      )}
                      <span>Tentatives : {task.attempts}/{task.maxAttempts}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  {task.status === 'SCHEDULED' && (
                    <>
                      <Button
                        variant="amber"
                        size="sm"
                        onClick={() => handlePublishNow(task)}
                        icon={<Send className="w-3.5 h-3.5" />}
                      >
                        Publier Maintenant
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelTask(task)}
                        icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                      >
                        Annuler
                      </Button>
                    </>
                  )}

                  {task.status === 'FAILED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePublishNow(task)}
                      icon={<RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                    >
                      Réessayer
                    </Button>
                  )}

                  {task.status === 'PUBLISHED' && (
                    <a
                      href={task.destinationUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Voir en Ligne
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* CALENDAR VIEW */
        <Card className="p-6 bg-slate-900 border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Planning des Publications — Octobre 2026</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={<ChevronLeft className="w-4 h-4" />}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                Suivant
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 py-2">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div>Sam</div>
            <div>Dim</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const hasEvents = day === 3 || day === 4 || day === 5;
              return (
                <div
                  key={day}
                  className={`min-h-24 p-2 rounded-xl border transition-all ${
                    day === 3
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${day === 3 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {day}
                    </span>
                    {day === 3 && (
                      <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                        Aujourd'hui
                      </span>
                    )}
                  </div>

                  {hasEvents && (
                    <div className="mt-2 space-y-1">
                      <div className="p-1 rounded bg-rose-950/50 border border-rose-900/50 text-[10px] text-rose-300 truncate font-semibold flex items-center gap-1">
                        <PinIcon className="w-2.5 h-2.5" /> Épingle Dragon Case
                      </div>
                      {day === 3 && (
                        <div className="p-1 rounded bg-amber-950/50 border border-amber-900/50 text-[10px] text-amber-300 truncate font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-2.5 h-2.5" /> Etsy Listing Sync
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title="Programmer une Publication Multi-Plateforme"
          subtitle="Enregistrement différé avec protection d'idempotence"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Plateforme Cible</label>
              <select
                value={scheduleForm.platform}
                onChange={(e) => setScheduleForm({ ...scheduleForm, platform: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="pinterest">Pinterest Business (POST /v5/pins)</option>
                <option value="etsy">Etsy Store (PATCH Listing)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Titre du Contenu</label>
              <input
                type="text"
                value={scheduleForm.productTitle}
                onChange={(e) => setScheduleForm({ ...scheduleForm, productTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
              <textarea
                rows={3}
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Date d'Exécution</label>
                <input
                  type="date"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Heure (UTC)</label>
                <input
                  type="time"
                  value={scheduleForm.scheduledTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsScheduleModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="amber" size="sm" onClick={handleCreateSchedule}>
                Confirmer la Programmation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
