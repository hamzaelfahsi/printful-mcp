export interface AppNotification {
  id: string;
  type:
    | 'PUBLICATION_SCHEDULED'
    | 'PUBLICATION_STARTED'
    | 'PUBLICATION_SUCCESS'
    | 'PUBLICATION_FAILED'
    | 'RETRY_SCHEDULED'
    | 'ACCOUNT_DISCONNECTED'
    | 'TOKEN_EXPIRED'
    | 'ANALYTICS_SYNC_COMPLETED'
    | 'ANALYTICS_SYNC_FAILED';
  title: string;
  message: string;
  platform: 'etsy' | 'pinterest' | 'all';
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: AppNotification[] = [];

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public notify(data: {
    type: AppNotification['type'];
    title: string;
    message: string;
    platform?: 'etsy' | 'pinterest' | 'all';
    severity?: AppNotification['severity'];
    metadata?: Record<string, any>;
  }): AppNotification {
    // Sanitize metadata to never include tokens
    const cleanMeta = { ...data.metadata };
    delete cleanMeta.accessToken;
    delete cleanMeta.refreshToken;
    delete cleanMeta.secret;

    const notif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: data.type,
      title: data.title,
      message: data.message,
      platform: data.platform || 'all',
      severity: data.severity || 'info',
      timestamp: new Date().toISOString(),
      read: false,
      metadata: cleanMeta
    };

    this.notifications.unshift(notif);
    if (this.notifications.length > 200) {
      this.notifications = this.notifications.slice(0, 200);
    }
    return notif;
  }

  public getNotifications(limit = 50): AppNotification[] {
    return this.notifications.slice(0, limit);
  }

  public markAsRead(id: string): void {
    const n = this.notifications.find((item) => item.id === id);
    if (n) n.read = true;
  }

  public markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
  }
}
