import { PinterestService, PinterestPinAnalytics } from './PinterestService.js';

export interface DailyMetricRecord {
  accountId: string;
  pinId?: string;
  date: string;
  metricName: 'IMPRESSION' | 'PIN_CLICK' | 'OUTBOUND_CLICK' | 'SAVE';
  metricValue: number;
}

export class PinterestAnalyticsService {
  private static instance: PinterestAnalyticsService;
  private dailyMetrics: DailyMetricRecord[] = [];

  public static getInstance(): PinterestAnalyticsService {
    if (!PinterestAnalyticsService.instance) {
      PinterestAnalyticsService.instance = new PinterestAnalyticsService();
    }
    return PinterestAnalyticsService.instance;
  }

  public recordMetric(metric: DailyMetricRecord): void {
    this.dailyMetrics.push(metric);
  }

  public async getAggregatedPinMetrics(pinId: string): Promise<PinterestPinAnalytics> {
    return PinterestService.getInstance().getPinAnalytics(pinId);
  }

  public getDailyMetrics(accountId: string, days = 30): DailyMetricRecord[] {
    return this.dailyMetrics.filter((m) => m.accountId === accountId);
  }
}
