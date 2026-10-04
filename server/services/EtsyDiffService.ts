import { EtsyProduct } from '../../src/types/index.js';
import { EtsyRawListing } from './EtsyService.js';
import { AuditService } from './AuditService.js';

export type DiffChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'UNCHANGED' | 'CONFLICT';

export interface FieldDiff {
  fieldName: string;
  localValue: any;
  etsyValue: any;
  isDifferent: boolean;
}

export interface ProductDiffResult {
  listingId: number;
  title: string;
  changeType: DiffChangeType;
  localProduct?: EtsyProduct;
  etsyListing?: Partial<EtsyProduct>;
  fieldDiffs: FieldDiff[];
  hasConflict: boolean;
  recommendedAction: 'ACCEPT_ETSY' | 'KEEP_LOCAL' | 'REVIEW';
}

export class EtsyDiffService {
  /**
   * Compares an array of local products with live listings from Etsy API
   */
  public static compare(localProducts: EtsyProduct[], remoteListings: EtsyProduct[]): ProductDiffResult[] {
    const diffs: ProductDiffResult[] = [];
    const localMap = new Map<number, EtsyProduct>();
    const remoteMap = new Map<number, EtsyProduct>();

    for (const p of localProducts) {
      localMap.set(p.listingId, p);
    }
    for (const r of remoteListings) {
      remoteMap.set(r.listingId, r);
    }

    // 1. Check for MODIFIED, UNCHANGED, CONFLICT, or DELETED
    for (const [listingId, local] of localMap.entries()) {
      const remote = remoteMap.get(listingId);

      if (!remote) {
        // Product in local DB but deleted from Etsy
        diffs.push({
          listingId,
          title: local.title,
          changeType: 'DELETED',
          localProduct: local,
          fieldDiffs: [
            { fieldName: 'state', localValue: local.status, etsyValue: 'DELETED_OR_REMOVED', isDifferent: true }
          ],
          hasConflict: false,
          recommendedAction: 'REVIEW'
        });
      } else {
        // Compare field by field
        const fieldDiffs: FieldDiff[] = [
          {
            fieldName: 'Titre',
            localValue: local.title,
            etsyValue: remote.title,
            isDifferent: local.title.trim() !== remote.title.trim()
          },
          {
            fieldName: 'Prix ($)',
            localValue: local.priceAmount,
            etsyValue: remote.priceAmount,
            isDifferent: Math.abs(local.priceAmount - remote.priceAmount) > 0.01
          },
          {
            fieldName: 'Statut',
            localValue: local.status,
            etsyValue: remote.status,
            isDifferent: local.status !== remote.status
          },
          {
            fieldName: 'Quantité',
            localValue: local.quantity,
            etsyValue: remote.quantity,
            isDifferent: local.quantity !== remote.quantity
          },
          {
            fieldName: 'Tags',
            localValue: local.tags.slice().sort().join(', '),
            etsyValue: remote.tags.slice().sort().join(', '),
            isDifferent: local.tags.slice().sort().join(',') !== remote.tags.slice().sort().join(',')
          }
        ];

        const changedFields = fieldDiffs.filter((f) => f.isDifferent);

        if (changedFields.length === 0) {
          diffs.push({
            listingId,
            title: local.title,
            changeType: 'UNCHANGED',
            localProduct: local,
            etsyListing: remote,
            fieldDiffs: [],
            hasConflict: false,
            recommendedAction: 'KEEP_LOCAL'
          });
        } else {
          // Check for conflict (local modified timestamp vs remote modified timestamp)
          const localModified = new Date(local.lastModifiedEtsy || 0).getTime();
          const remoteModified = new Date(remote.lastModifiedEtsy || 0).getTime();
          const hasConflict = remoteModified > localModified && local.status === 'draft';

          diffs.push({
            listingId,
            title: local.title,
            changeType: hasConflict ? 'CONFLICT' : 'MODIFIED',
            localProduct: local,
            etsyListing: remote,
            fieldDiffs: changedFields,
            hasConflict,
            recommendedAction: hasConflict ? 'REVIEW' : 'ACCEPT_ETSY'
          });
        }
      }
    }

    // 2. Check for ADDED (in Etsy API but not in local DB)
    for (const [listingId, remote] of remoteMap.entries()) {
      if (!localMap.has(listingId)) {
        diffs.push({
          listingId,
          title: remote.title,
          changeType: 'ADDED',
          etsyListing: remote,
          fieldDiffs: [
            { fieldName: 'Nouveau Listing', localValue: null, etsyValue: remote.title, isDifferent: true }
          ],
          hasConflict: false,
          recommendedAction: 'ACCEPT_ETSY'
        });
      }
    }

    return diffs;
  }
}
