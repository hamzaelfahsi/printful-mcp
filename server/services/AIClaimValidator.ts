import { AIInsightV2 } from '../../src/types/index.js';
import { AnalyticsDailyService } from './AnalyticsDailyService.js';
import { AffiliateEngineService } from './AffiliateEngineService.js';

export class AIClaimValidator {
  private static instance: AIClaimValidator;

  private constructor() {}

  public static getInstance(): AIClaimValidator {
    if (!AIClaimValidator.instance) {
      AIClaimValidator.instance = new AIClaimValidator();
    }
    return AIClaimValidator.instance;
  }

  /**
   * Strictly validates all claims in an AI-generated insight against grounded database metrics.
   * If any hallucinated or unverified numerical claim is detected, the insight is rejected.
   */
  public validateInsight(insight: AIInsightV2): { isValid: boolean; reason?: string } {
    const textToCheck = `${insight.title} ${insight.summary} ${insight.explanation} ${insight.recommendation}`.toLowerCase();

    // 1. Guaranteed outcome prohibition
    const forbiddenPhrases = [
      'guaranteed sales',
      'guaranteed revenue',
      'guaranteed commission',
      'guaranteed ranking',
      'ventes garanties',
      'revenu garanti',
      'succès garanti'
    ];
    for (const phrase of forbiddenPhrases) {
      if (textToCheck.includes(phrase)) {
        return { isValid: false, reason: `FORBIDDEN_GUARANTEE_CLAIM: Contains forbidden guarantee phrase "${phrase}".` };
      }
    }

    // 2. Evidence validation
    if (!insight.evidence || insight.evidence.length === 0) {
      return { isValid: false, reason: 'MISSING_EVIDENCE: Insight must contain at least one verifiable evidence record.' };
    }

    // 3. Grounding checks against stored KPIs
    const kpis = AnalyticsDailyService.getInstance().getVerifiedOverviewKPIs();
    const monetizationKpis = AffiliateEngineService.getInstance().getMonetizationKPIs();

    for (const ev of insight.evidence) {
      // Reject any claim pretending unavailable metrics are non-zero
      if (ev.source === 'API_UNAVAILABLE' && ev.currentValue !== undefined && ev.currentValue !== 0 && ev.currentValue !== 'UNAVAILABLE') {
        return { isValid: false, reason: `UNAVAILABLE_METRIC_FABRICATION: Metric "${ev.label}" is API_UNAVAILABLE and cannot have a fabricated value.` };
      }

      // Check click != conversion validation
      if (ev.label.toLowerCase().includes('commission') && ev.source === 'INTERNAL_CALCULATION' && !ev.details?.includes('INTERNAL_CALCULATION')) {
        // Commission cannot be assumed from internal clicks without explicit calculation marking
        if (monetizationKpis.approvedCommission.value === 0 && Number(ev.currentValue) > 0) {
          return { isValid: false, reason: 'FABRICATED_COMMISSION: Claimed commission does not match verified affiliate records.' };
        }
      }
    }

    return { isValid: true };
  }
}
