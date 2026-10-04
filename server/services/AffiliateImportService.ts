import { ImportResult } from '../../src/types/index.js';
import { AffiliateEngineService } from './AffiliateEngineService.js';
import { AuditService } from './AuditService.js';
import { NotificationService } from './NotificationService.js';

export class AffiliateImportService {
  private static instance: AffiliateImportService;
  private readonly maxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

  private constructor() {}

  public static getInstance(): AffiliateImportService {
    if (!AffiliateImportService.instance) {
      AffiliateImportService.instance = new AffiliateImportService();
    }
    return AffiliateImportService.instance;
  }

  /**
   * Defends against CSV Formula Injection by neutralizing dangerous characters (=, +, -, @, \t, \r)
   */
  public sanitizeCsvField(field: string): string {
    if (!field || typeof field !== 'string') return '';
    let sanitized = field.trim();
    // Neutralize formula trigger characters
    if (/^[=+\-@\t\r]/.test(sanitized)) {
      sanitized = "'" + sanitized;
    }
    // Prevent XSS / HTML tags
    sanitized = sanitized.replace(/<[^>]*>?/gm, '');
    return sanitized;
  }

  /**
   * Imports CSV affiliate transaction / commission reporting
   */
  public async importCsv(csvContent: string): Promise<ImportResult> {
    if (!csvContent || csvContent.length > this.maxFileSizeBytes) {
      throw new Error('OVERSIZED_OR_EMPTY_FILE: File size exceeds the 5MB security limit or is empty.');
    }

    const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        skippedCount: 0,
        errors: ['HEADER_ONLY_OR_EMPTY: CSV must contain a header and at least one data row.'],
        records: []
      };
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredColumns = ['external_id', 'order_value', 'commission_amount', 'currency', 'status'];
    const missing = requiredColumns.filter((c) => !header.includes(c));

    if (missing.length > 0) {
      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        skippedCount: lines.length - 1,
        errors: [`MISSING_COLUMNS: Missing required columns: ${missing.join(', ')}`],
        records: []
      };
    }

    const engine = AffiliateEngineService.getInstance();
    const records: any[] = [];
    const errors: string[] = [];
    let importedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((f) => this.sanitizeCsvField(f));
      if (row.length < header.length) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Incomplete row data.`);
        continue;
      }

      const rowObj: Record<string, string> = {};
      header.forEach((h, idx) => {
        rowObj[h] = row[idx];
      });

      const externalId = rowObj['external_id'];
      const orderValue = parseFloat(rowObj['order_value']);
      const commissionAmount = parseFloat(rowObj['commission_amount']);
      const currency = (rowObj['currency'] || 'USD').toUpperCase();
      const statusRaw = (rowObj['status'] || 'APPROVED').toUpperCase();

      if (!externalId) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Missing external_id.`);
        continue;
      }

      if (isNaN(commissionAmount)) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Invalid commission_amount numeric value.`);
        continue;
      }

      // Check duplicate
      const existing = engine.getCommissions().find((c) => c.externalId === externalId);
      if (existing) {
        duplicateCount++;
        continue;
      }

      // Record conversion and commission
      const conversion = await engine.recordConversion({
        externalId: `CNV_${externalId}`,
        occurredAt: rowObj['date'] || new Date().toISOString(),
        status: statusRaw === 'PAID' || statusRaw === 'APPROVED' ? 'QUALIFYING' : 'CONVERTED',
        orderValue: isNaN(orderValue) ? undefined : orderValue,
        currency,
        source: 'IMPORTED_PROVIDER_DATA'
      });

      const commission = await engine.recordCommission({
        conversionId: conversion.id,
        externalId,
        commissionAmount,
        currency,
        status: statusRaw as any,
        source: 'IMPORTED_PROVIDER_DATA'
      });

      importedCount++;
      records.push(commission);
    }

    await AuditService.log(
      'AFFILIATE_IMPORT_COMPLETED',
      'affiliate_import',
      'csv_batch',
      `Imported: ${importedCount} | Duplicates: ${duplicateCount} | Skipped: ${skippedCount}`
    );

    NotificationService.getInstance().notify({
      type: 'PUBLICATION_SUCCESS',
      title: 'Rapport d’Affiliation Importé',
      message: `Import CSV terminé : ${importedCount} commissions enregistrées (${duplicateCount} doublons ignorés).`,
      severity: 'info'
    });

    return {
      success: errors.length === 0 || importedCount > 0,
      importedCount,
      duplicateCount,
      skippedCount,
      errors,
      records
    };
  }

  /**
   * Imports JSON affiliate reporting payload
   */
  public async importJson(jsonContent: string): Promise<ImportResult> {
    if (!jsonContent || jsonContent.length > this.maxFileSizeBytes) {
      throw new Error('OVERSIZED_OR_EMPTY_FILE: JSON payload exceeds the 5MB security limit or is empty.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (e: any) {
      return {
        success: false,
        importedCount: 0,
        duplicateCount: 0,
        skippedCount: 0,
        errors: [`MALFORMED_JSON: ${e.message}`],
        records: []
      };
    }

    const items = Array.isArray(parsed) ? parsed : parsed.items || parsed.records || [parsed];
    const engine = AffiliateEngineService.getInstance();
    const records: any[] = [];
    const errors: string[] = [];
    let importedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const externalId = item.external_id || item.transaction_id || item.externalId;
      const commissionAmount = parseFloat(item.commission_amount || item.commission || item.amount);
      const currency = String(item.currency || 'USD').toUpperCase();
      const status = String(item.status || 'APPROVED').toUpperCase();

      if (!externalId || isNaN(commissionAmount)) {
        skippedCount++;
        errors.push(`Item ${i + 1}: Missing external_id or valid commission_amount.`);
        continue;
      }

      // Check duplicate
      const existing = engine.getCommissions().find((c) => c.externalId === externalId);
      if (existing) {
        duplicateCount++;
        continue;
      }

      const commission = await engine.recordCommission({
        externalId,
        commissionAmount,
        currency,
        status: status as any,
        source: 'IMPORTED_PROVIDER_DATA'
      });

      importedCount++;
      records.push(commission);
    }

    await AuditService.log(
      'AFFILIATE_IMPORT_COMPLETED',
      'affiliate_import',
      'json_batch',
      `Imported: ${importedCount} | Duplicates: ${duplicateCount} | Skipped: ${skippedCount}`
    );

    return {
      success: errors.length === 0 || importedCount > 0,
      importedCount,
      duplicateCount,
      skippedCount,
      errors,
      records
    };
  }
}
