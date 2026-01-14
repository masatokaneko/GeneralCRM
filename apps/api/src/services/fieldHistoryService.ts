import { fieldHistoryRepository } from "../repositories/fieldHistoryRepository.js";
import type { TrackableObjectName, FieldChange } from "../types/index.js";

/**
 * FieldHistoryService tracks field changes for audit purposes.
 *
 * Usage:
 * 1. Before update, call trackChanges() with old and new record states
 * 2. The service will check which fields are tracked and record changes
 */
export class FieldHistoryService {
  // Cache for tracked fields (per tenant+object)
  private trackedFieldsCache: Map<string, { fields: string[]; expiry: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Track field changes between old and new record states
   */
  async trackChanges(
    tenantId: string,
    userId: string,
    objectName: TrackableObjectName,
    recordId: string,
    oldRecord: Record<string, unknown> | null,
    newRecord: Record<string, unknown>
  ): Promise<void> {
    // Get tracked fields for this object
    const trackedFields = await this.getTrackedFields(tenantId, objectName);

    if (trackedFields.length === 0) {
      return; // No fields to track
    }

    const changes: FieldChange[] = [];

    for (const fieldName of trackedFields) {
      const oldValue = oldRecord ? this.getFieldValue(oldRecord, fieldName) : undefined;
      const newValue = this.getFieldValue(newRecord, fieldName);

      // Check if value changed (handle undefined vs null)
      if (!this.valuesEqual(oldValue, newValue)) {
        changes.push({
          fieldName,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
        });
      }
    }

    // Record the changes
    if (changes.length > 0) {
      await fieldHistoryRepository.recordChanges(
        tenantId,
        userId,
        objectName,
        recordId,
        changes
      );
    }
  }

  /**
   * Get tracked fields for an object (with caching)
   */
  private async getTrackedFields(tenantId: string, objectName: TrackableObjectName): Promise<string[]> {
    const cacheKey = `${tenantId}:${objectName}`;
    const cached = this.trackedFieldsCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.fields;
    }

    const fields = await fieldHistoryRepository.getTrackedFields(tenantId, objectName);

    this.trackedFieldsCache.set(cacheKey, {
      fields,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });

    return fields;
  }

  /**
   * Clear cache for a specific tenant+object (call after tracking settings change)
   */
  clearCache(tenantId: string, objectName?: TrackableObjectName): void {
    if (objectName) {
      this.trackedFieldsCache.delete(`${tenantId}:${objectName}`);
    } else {
      // Clear all cache for tenant
      for (const key of this.trackedFieldsCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.trackedFieldsCache.delete(key);
        }
      }
    }
  }

  /**
   * Get field value from record, supporting camelCase field names
   */
  private getFieldValue(record: Record<string, unknown>, fieldName: string): unknown {
    // Direct match
    if (fieldName in record) {
      return record[fieldName];
    }

    // Try snake_case conversion
    const snakeCase = fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (snakeCase in record) {
      return record[snakeCase];
    }

    return undefined;
  }

  /**
   * Compare two values for equality
   */
  private valuesEqual(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a === null || a === undefined) {
      return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
      return false;
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date) {
      return a.toISOString() === String(b);
    }
    if (b instanceof Date) {
      return String(a) === b.toISOString();
    }

    // Handle objects/arrays (JSON comparison)
    if (typeof a === "object" && typeof b === "object") {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    // Primitive comparison
    return a === b;
  }
}

export const fieldHistoryService = new FieldHistoryService();
