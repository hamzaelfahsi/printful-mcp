import { AnomalyDetectionResult, AIInsightSeverity } from '../../src/types/index.js';

export class AnomalyDetectionService {
  private static instance: AnomalyDetectionService;
  private readonly minSampleThreshold = 5;

  private constructor() {}

  public static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  /**
   * Detects unusual statistical shifts in a metric time series.
   */
  public detectAnomaly(metricName: string, history: number[], latestValue: number): AnomalyDetectionResult {
    if (!history || history.length < this.minSampleThreshold) {
      return {
        metricName,
        isAnomaly: false,
        severity: 'INFO',
        baseline: 0,
        currentValue: latestValue,
        deviationPercent: 0,
        explanation: 'INSUFFICIENT_DATA: Historical baseline sample too small for anomaly scoring.'
      };
    }

    const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
    const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    let deviationPercent = 0;
    if (mean > 0) {
      deviationPercent = Number((((latestValue - mean) / mean) * 100).toFixed(1));
    }

    // Significant outlier threshold (2 standard deviations or > 60% shift)
    const isOutlier = stdDev > 0 ? Math.abs(latestValue - mean) >= 2 * stdDev : Math.abs(deviationPercent) >= 60;
    let severity: AIInsightSeverity = 'INFO';

    if (isOutlier) {
      severity = Math.abs(deviationPercent) >= 80 ? 'HIGH' : 'MEDIUM';
    }

    return {
      metricName,
      isAnomaly: isOutlier,
      severity,
      baseline: Number(mean.toFixed(2)),
      currentValue: latestValue,
      deviationPercent,
      explanation: isOutlier
        ? `Écart significatif de ${deviationPercent > 0 ? '+' : ''}${deviationPercent}% détecté par rapport à la moyenne (${mean.toFixed(1)}).`
        : `Valeur dans les intervalles de fluctuation statistiques normaux.`
    };
  }
}
