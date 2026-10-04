import { AuditLogEntry } from '../../src/types/index.js';

export class AuditService {
  private static logs: AuditLogEntry[] = [];

  public static async log(
    action: string,
    resourceType: string,
    resourceId: string,
    details: string,
    status: 'success' | 'warning' | 'error' = 'success'
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      action,
      resourceType,
      resourceId,
      details,
      status,
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(entry);
    // Keep max 500 in memory buffer for demo / fast lookups
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(0, 500);
    }
    return entry;
  }

  public static getRecentLogs(limit = 20): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }
}
