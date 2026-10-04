import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  NavigationTab, 
  EtsyProduct, 
  EtsyOrder, 
  PinterestBoard, 
  PinterestPin, 
  ContentItem, 
  AffiliateLink, 
  AIInsight, 
  SystemNotification,
  DashboardKPIs
} from '../types/index.js';
import { 
  DEMO_KPIS, 
  DEMO_PRODUCTS, 
  DEMO_ORDERS, 
  DEMO_BOARDS, 
  DEMO_PINS, 
  DEMO_CONTENT_QUEUE, 
  DEMO_AFFILIATE_LINKS, 
  DEMO_INSIGHTS, 
  DEMO_NOTIFICATIONS 
} from './DemoData.js';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  isLiveLoading: boolean;
  liveError: string | null;
  fetchLiveProducts: () => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // Data State
  kpis: DashboardKPIs;
  products: EtsyProduct[];
  orders: EtsyOrder[];
  boards: PinterestBoard[];
  pins: PinterestPin[];
  contentQueue: ContentItem[];
  affiliateLinks: AffiliateLink[];
  insights: AIInsight[];
  notifications: SystemNotification[];
  
  // Global Dialogs & Modals
  confirmDialog: ConfirmDialogState | null;
  showConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void;
  closeConfirmDialog: () => void;
  
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (val: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (val: boolean) => void;
  
  // Actions
  approveContentItem: (id: string) => void;
  scheduleContentItem: (id: string, date: string) => void;
  publishContentItem: (id: string) => Promise<void>;
  deleteContentItem: (id: string) => void;
  deactivateProduct: (id: string) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Data Stores initialized with Demo Data
  const [kpis, setKpis] = useState<DashboardKPIs>(DEMO_KPIS);
  const [products, setProducts] = useState<EtsyProduct[]>(DEMO_PRODUCTS);
  const [orders, setOrders] = useState<EtsyOrder[]>(DEMO_ORDERS);
  const [boards, setBoards] = useState<PinterestBoard[]>(DEMO_BOARDS);
  const [pins, setPins] = useState<PinterestPin[]>(DEMO_PINS);
  const [contentQueue, setContentQueue] = useState<ContentItem[]>(DEMO_CONTENT_QUEUE);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>(DEMO_AFFILIATE_LINKS);
  const [insights, setInsights] = useState<AIInsight[]>(DEMO_INSIGHTS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(DEMO_NOTIFICATIONS);

  // Modals & Popovers
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Live Etsy Listings State
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const fetchLiveProducts = async () => {
    setIsLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch('/api/etsy/listings');
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setProducts([]);
          const msg =
            data?.message ||
            'Aucun compte Etsy connecté. Veuillez connecter votre compte Etsy dans les Paramètres.';
          setLiveError(msg);
          showToast({
            type: 'warning',
            title: 'Compte Etsy non connecté',
            message: msg
          });
        } else {
          const msg = data?.message || 'Erreur lors de la récupération des listings Etsy réels.';
          setLiveError(msg);
          showToast({
            type: 'error',
            title: 'Erreur API Etsy',
            message: msg
          });
        }
        return;
      }

      if (data.listings && Array.isArray(data.listings)) {
        setProducts(data.listings);
        setLiveError(null);
        showToast({
          type: 'success',
          title: 'Catalogue Etsy Live Synchronisé',
          message: `${data.listings.length} listings réels chargés depuis la boutique ${data.shopName || ''}.`
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'Impossible de joindre le serveur pour charger les listings réels.';
      setLiveError(msg);
      showToast({
        type: 'error',
        title: 'Erreur Réseau',
        message: msg
      });
    } finally {
      setIsLiveLoading(false);
    }
  };

  // Sync mode changes (Demo vs Live)
  useEffect(() => {
    if (isDemoMode) {
      setProducts(DEMO_PRODUCTS);
      setLiveError(null);
      setIsLiveLoading(false);
    } else {
      let isCancelled = false;
      const load = async () => {
        setIsLiveLoading(true);
        setLiveError(null);
        try {
          const res = await fetch('/api/etsy/listings');
          const data = await res.json();
          if (isCancelled) return;
          if (!res.ok) {
            if (res.status === 401) {
              setProducts([]);
              const msg =
                data?.message ||
                'Aucun compte Etsy connecté. Veuillez connecter votre boutique Etsy dans les Paramètres.';
              setLiveError(msg);
              showToast({
                type: 'warning',
                title: 'Compte Etsy non connecté',
                message: msg
              });
            } else {
              const msg = data?.message || 'Erreur lors de la récupération des listings Etsy réels.';
              setLiveError(msg);
              showToast({
                type: 'error',
                title: 'Erreur API Etsy',
                message: msg
              });
            }
          } else if (data.listings && Array.isArray(data.listings)) {
            setProducts(data.listings);
            setLiveError(null);
            showToast({
              type: 'success',
              title: 'Catalogue Etsy Live Synchronisé',
              message: `${data.listings.length} listings réels chargés depuis la boutique ${data.shopName || ''}.`
            });
          }
        } catch (err: any) {
          if (isCancelled) return;
          const msg = err?.message || 'Impossible de joindre le serveur pour charger les listings réels.';
          setLiveError(msg);
          showToast({
            type: 'error',
            title: 'Erreur Réseau',
            message: msg
          });
        } finally {
          if (!isCancelled) {
            setIsLiveLoading(false);
          }
        }
      };
      load();
      return () => {
        isCancelled = true;
      };
    }
  }, [isDemoMode]);

  // Theme synchronization
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  // Keyboard shortcut for Command+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showConfirmDialog = (config: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({ ...config, isOpen: true });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const approveContentItem = (id: string) => {
    setContentQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'approved', updatedAt: new Date().toISOString() } : item
      )
    );
    showToast({
      type: 'success',
      title: 'Contenu Approuvé',
      message: 'L’élément est maintenant prêt pour la publication ou la programmation.'
    });
  };

  const scheduleContentItem = (id: string, date: string) => {
    setContentQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'scheduled', scheduledDate: date, updatedAt: new Date().toISOString() }
          : item
      )
    );
    showToast({
      type: 'info',
      title: 'Publication Programmée',
      message: `Prévue pour le ${new Date(date).toLocaleString('fr-FR')}`
    });
  };

  const publishContentItem = async (id: string) => {
    const item = contentQueue.find((q) => q.id === id);
    if (!item) return;

    setContentQueue((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status: 'published', updatedAt: new Date().toISOString() } : q
      )
    );

    // If Pinterest pin, add to published pins
    if (item.targetPlatform === 'pinterest' || item.targetPlatform === 'both') {
      const newPin: PinterestPin = {
        id: 'pin_' + Math.random().toString(36).substring(2, 8),
        title: item.title,
        description: item.description,
        boardId: item.targetBoardId || 'board_1',
        boardName: item.targetBoardName || 'Aesthetic Phone Cases & Art',
        imageUrl: item.imageUrl,
        destinationUrl: item.destinationUrl,
        createdAt: new Date().toISOString(),
        impressions: 0,
        saves: 0,
        outboundClicks: 0,
        ctr: 0
      };
      setPins((prev) => [newPin, ...prev]);
    }

    showToast({
      type: 'success',
      title: 'Publication réussie',
      message: `Le contenu a été publié en direct sur ${item.targetPlatform === 'both' ? 'Etsy et Pinterest' : item.targetPlatform}.`
    });
  };

  const deleteContentItem = (id: string) => {
    setContentQueue((prev) => prev.filter((item) => item.id !== id));
    showToast({
      type: 'info',
      title: 'Élément supprimé',
      message: 'Le brouillon a été retiré de la file d’attente.'
    });
  };

  const deactivateProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'draft' } : p))
    );
    showToast({
      type: 'warning',
      title: 'Listing Désactivé',
      message: 'Le produit a été passé en mode brouillon / inactif.'
    });
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast({
      type: 'warning',
      title: 'Produit Supprimé',
      message: 'Le listing a été supprimé de votre catalogue.'
    });
  };

  const duplicateProduct = (id: string) => {
    const original = products.find((p) => p.id === id);
    if (!original) return;
    const duplicated: EtsyProduct = {
      ...original,
      id: 'prod_' + Math.random().toString(36).substring(2, 9),
      listingId: Math.floor(1000000000 + Math.random() * 9000000000),
      title: `${original.title} (Copie)`,
      status: 'draft',
      viewsCount: 0,
      favoritesCount: 0,
      salesCount: 0,
      revenueAmount: 0,
      conversionRate: 0,
      lastSyncedAt: new Date().toISOString()
    };
    setProducts((prev) => [duplicated, ...prev]);
    showToast({
      type: 'success',
      title: 'Produit Dupliqué',
      message: 'Un nouveau brouillon basé sur ce produit a été créé.'
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const refreshData = async () => {
    showToast({
      type: 'info',
      title: 'Synchronisation en cours',
      message: 'Récupération des dernières statistiques Etsy & Pinterest...'
    });
    // simulate sync network delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    showToast({
      type: 'success',
      title: 'Données à jour',
      message: 'Toutes vos métriques ont été synchronisées.'
    });
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isDemoMode,
        setIsDemoMode,
        isLiveLoading,
        liveError,
        fetchLiveProducts,
        theme,
        toggleTheme,
        kpis,
        products,
        orders,
        boards,
        pins,
        contentQueue,
        affiliateLinks,
        insights,
        notifications,
        confirmDialog,
        showConfirmDialog,
        closeConfirmDialog,
        toasts,
        showToast,
        removeToast,
        isGlobalSearchOpen,
        setIsGlobalSearchOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        approveContentItem,
        scheduleContentItem,
        publishContentItem,
        deleteContentItem,
        deactivateProduct,
        deleteProduct,
        duplicateProduct,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
