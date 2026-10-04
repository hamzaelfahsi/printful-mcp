import crypto from 'crypto';
import { AIExperiment, AIExperimentVariable, AIExperimentStatus } from '../../src/types/index.js';
import { AuditService } from './AuditService.js';

export class AIExperimentService {
  private static instance: AIExperimentService;
  private experiments: Map<string, AIExperiment> = new Map();

  private constructor() {
    this.seedInitialExperiments();
  }

  public static getInstance(): AIExperimentService {
    if (!AIExperimentService.instance) {
      AIExperimentService.instance = new AIExperimentService();
    }
    return AIExperimentService.instance;
  }

  public getExperiments(): AIExperiment[] {
    return Array.from(this.experiments.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async createExperiment(data: {
    name: string;
    hypothesis: string;
    platform: 'etsy' | 'pinterest';
    contentType: string;
    variable: AIExperimentVariable;
    control: string;
    variant: string;
    successMetric: string;
  }): Promise<AIExperiment> {
    const experimentId = 'exp_' + crypto.randomBytes(6).toString('hex');
    const experiment: AIExperiment = {
      id: experimentId,
      userId: 'user_owner_default',
      name: data.name,
      hypothesis: data.hypothesis,
      platform: data.platform,
      contentType: data.contentType,
      variable: data.variable,
      control: data.control,
      variant: data.variant,
      status: 'DRAFT',
      successMetric: data.successMetric,
      sampleSize: 0,
      source: 'API_VERIFIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.experiments.set(experiment.id, experiment);

    await AuditService.log(
      'AI_EXPERIMENT_CREATED',
      'ai_experiment',
      experiment.id,
      `Created A/B experiment "${experiment.name}" on variable ${experiment.variable} (${experiment.platform})`
    );

    return experiment;
  }

  public async updateExperimentStatus(experimentId: string, status: AIExperimentStatus): Promise<AIExperiment> {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error('EXPERIMENT_NOT_FOUND: Experiment ID does not exist.');

    exp.status = status;
    if (status === 'RUNNING') exp.startDate = new Date().toISOString();
    if (status === 'COMPLETED' || status === 'CANCELLED') exp.endDate = new Date().toISOString();
    exp.updatedAt = new Date().toISOString();

    this.experiments.set(experimentId, exp);

    await AuditService.log('AI_EXPERIMENT_STATUS_UPDATED', 'ai_experiment', experimentId, `Status updated to ${status}`);
    return exp;
  }

  public recordExperimentObservation(experimentId: string, data: {
    controlValue: number;
    variantValue: number;
    sampleSize: number;
  }): AIExperiment {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error('EXPERIMENT_NOT_FOUND');

    exp.sampleSize = data.sampleSize;
    exp.controlMetricValue = data.controlValue;
    exp.variantMetricValue = data.variantValue;

    if (data.controlValue > 0) {
      exp.differencePercent = Number((((data.variantValue - data.controlValue) / data.controlValue) * 100).toFixed(1));
    }

    exp.updatedAt = new Date().toISOString();
    this.experiments.set(experimentId, exp);
    return exp;
  }

  private seedInitialExperiments() {
    this.createExperiment({
      name: 'Anime Dragon Case Pinterest Hook Test',
      hypothesis: 'Une accroche focalisée sur les reflets d’or vitrail génère plus de clics sortants qu’un titre standard.',
      platform: 'pinterest',
      contentType: 'pin',
      variable: 'TITLE',
      control: 'Japanese Celestial Dragon Phone Case',
      variant: '✨ Gold Foil Celestial Dragon Case | Stained Glass Anime Art',
      successMetric: 'outbound_clicks'
    }).then((exp) => {
      this.recordExperimentObservation(exp.id, {
        controlValue: 42,
        variantValue: 68,
        sampleSize: 110
      });
    });
  }
}
