import { TrendAnalysisResult, AIInsightConfidence } from '../../src/types/index.js';

export class TrendAnalysisService {
  private static instance: TrendAnalysisService;
  private readonly minSampleThreshold = 7;

  private constructor() {}

  public static getInstance(): TrendAnalysisService {
    if (!TrendAnalysisService.instance) {
      TrendAnalysisService.instance = new TrendAnalysisService();
    }
    return TrendAnalysisService.instance;
  }

  /**
   * Analyzes a time-series metric and returns trend direction with categorical confidence.
   * Avoids false trends from tiny samples.
   */
  public analyzeSeries(metricName: string, dataPoints: Array<{ date: string; value: number }>): TrendAnalysisResult {
    if (!dataPoints || dataPoints.length < this.minSampleThreshold) {
      return {
        metricName,
        direction: 'INSUFFICIENT_DATA',
        sampleCount: dataPoints?.length || 0,
        previousAverage: 0,
        currentAverage: 0,
        changePercent: 0,
        confidence: 'LOW'
      };
    }

    const n = dataPoints.length;
    const mid = Math.floor(n / 2);
    const prevHalf = dataPoints.slice(0, mid);
    const currHalf = dataPoints.slice(mid);

    const prevSum = prevHalf.reduce((acc, p) => acc + p.value, 0);
    const currSum = currHalf.reduce((acc, p) => acc + p.value, 0);

    const prevAvg = prevSum / prevHalf.length;
    const currAvg = currSum / currHalf.length;

    let changePercent = 0;
    if (prevAvg > 0) {
      changePercent = Number((((currAvg - prevAvg) / prevAvg) * 100).toFixed(1));
    } else if (currAvg > 0) {
      changePercent = 100.0;
    }

    let direction: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (changePercent >= 10.0) {
      direction = 'INCREASING';
    } else if (changePercent <= -10.0) {
      direction = 'DECREASING';
    }

    let confidence: AIInsightConfidence = 'MEDIUM';
    if (n >= 14) {
      confidence = 'HIGH';
    } else if (n < this.minSampleThreshold) {
      confidence = 'LOW';
    }

    return {
      metricName,
      direction,
      sampleCount: n,
      previousAverage: Number(prevAvg.toFixed(2)),
      currentAverage: Number(currAvg.toFixed(2)),
      changePercent,
      confidence
    };
  }
}
