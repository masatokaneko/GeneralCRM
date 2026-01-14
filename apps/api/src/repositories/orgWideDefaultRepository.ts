import { db } from "../db/index.js";
import type { OrgWideDefault, UpdateOrgWideDefaultInput } from "../types/index.js";

export const orgWideDefaultRepository = {
  async findByObject(tenantId: string, objectName: string): Promise<OrgWideDefault | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        object_name as "objectName",
        internal_access as "internalAccess",
        external_access as "externalAccess",
        grant_access_using_hierarchies as "grantAccessUsingHierarchies",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM org_wide_defaults
      WHERE tenant_id = $1 AND object_name = $2`,
      [tenantId, objectName]
    );
    return result.rows[0] || null;
  },

  async findAll(tenantId: string): Promise<OrgWideDefault[]> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        object_name as "objectName",
        internal_access as "internalAccess",
        external_access as "externalAccess",
        grant_access_using_hierarchies as "grantAccessUsingHierarchies",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM org_wide_defaults
      WHERE tenant_id = $1
      ORDER BY object_name`,
      [tenantId]
    );
    return result.rows;
  },

  async upsert(
    tenantId: string,
    objectName: string,
    data: UpdateOrgWideDefaultInput,
    userId: string
  ): Promise<OrgWideDefault> {
    const result = await db.query(
      `INSERT INTO org_wide_defaults (
        tenant_id,
        object_name,
        internal_access,
        external_access,
        grant_access_using_hierarchies,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $6)
      ON CONFLICT (tenant_id, object_name)
      DO UPDATE SET
        internal_access = COALESCE($3, org_wide_defaults.internal_access),
        external_access = COALESCE($4, org_wide_defaults.external_access),
        grant_access_using_hierarchies = COALESCE($5, org_wide_defaults.grant_access_using_hierarchies),
        updated_at = NOW(),
        updated_by = $6
      RETURNING
        id,
        tenant_id as "tenantId",
        object_name as "objectName",
        internal_access as "internalAccess",
        external_access as "externalAccess",
        grant_access_using_hierarchies as "grantAccessUsingHierarchies",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"`,
      [
        tenantId,
        objectName,
        data.internalAccess,
        data.externalAccess,
        data.grantAccessUsingHierarchies,
        userId,
      ]
    );
    return result.rows[0];
  },

  async update(
    tenantId: string,
    objectName: string,
    data: UpdateOrgWideDefaultInput,
    userId: string
  ): Promise<OrgWideDefault | null> {
    const updates: string[] = [];
    const params: unknown[] = [tenantId, objectName];
    let paramIndex = 3;

    if (data.internalAccess !== undefined) {
      updates.push(`internal_access = $${paramIndex++}`);
      params.push(data.internalAccess);
    }
    if (data.externalAccess !== undefined) {
      updates.push(`external_access = $${paramIndex++}`);
      params.push(data.externalAccess);
    }
    if (data.grantAccessUsingHierarchies !== undefined) {
      updates.push(`grant_access_using_hierarchies = $${paramIndex++}`);
      params.push(data.grantAccessUsingHierarchies);
    }

    if (updates.length === 0) {
      return this.findByObject(tenantId, objectName);
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);

    const result = await db.query(
      `UPDATE org_wide_defaults
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND object_name = $2
      RETURNING
        id,
        tenant_id as "tenantId",
        object_name as "objectName",
        internal_access as "internalAccess",
        external_access as "externalAccess",
        grant_access_using_hierarchies as "grantAccessUsingHierarchies",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy"`,
      params
    );
    return result.rows[0] || null;
  },

  // Initialize OWD for a new tenant with default values
  async initializeForTenant(tenantId: string, userId: string): Promise<void> {
    const defaultSettings = [
      { objectName: "Account", internalAccess: "Private", externalAccess: "Private", useHierarchy: true },
      { objectName: "Contact", internalAccess: "ControlledByParent", externalAccess: "Private", useHierarchy: true },
      { objectName: "Lead", internalAccess: "PublicReadWrite", externalAccess: "Private", useHierarchy: true },
      { objectName: "Opportunity", internalAccess: "Private", externalAccess: "Private", useHierarchy: true },
      { objectName: "Quote", internalAccess: "ControlledByParent", externalAccess: "Private", useHierarchy: true },
      { objectName: "Order", internalAccess: "ControlledByParent", externalAccess: "Private", useHierarchy: true },
      { objectName: "Contract", internalAccess: "Private", externalAccess: "Private", useHierarchy: true },
      { objectName: "Invoice", internalAccess: "Private", externalAccess: "Private", useHierarchy: true },
      { objectName: "Task", internalAccess: "ControlledByParent", externalAccess: "Private", useHierarchy: true },
      { objectName: "Event", internalAccess: "ControlledByParent", externalAccess: "Private", useHierarchy: true },
      { objectName: "Product", internalAccess: "PublicReadOnly", externalAccess: "Private", useHierarchy: false },
      { objectName: "Pricebook", internalAccess: "PublicReadOnly", externalAccess: "Private", useHierarchy: false },
    ];

    for (const setting of defaultSettings) {
      await this.upsert(
        tenantId,
        setting.objectName,
        {
          internalAccess: setting.internalAccess as "Private" | "PublicReadOnly" | "PublicReadWrite" | "ControlledByParent",
          externalAccess: setting.externalAccess as "Private" | "PublicReadOnly" | "PublicReadWrite",
          grantAccessUsingHierarchies: setting.useHierarchy,
        },
        userId
      );
    }
  },

  // Get supported objects list
  async getSupportedObjects(): Promise<{ objectName: string; displayName: string }[]> {
    return [
      { objectName: "Account", displayName: "Accounts" },
      { objectName: "Contact", displayName: "Contacts" },
      { objectName: "Lead", displayName: "Leads" },
      { objectName: "Opportunity", displayName: "Opportunities" },
      { objectName: "Quote", displayName: "Quotes" },
      { objectName: "Order", displayName: "Orders" },
      { objectName: "Contract", displayName: "Contracts" },
      { objectName: "Invoice", displayName: "Invoices" },
      { objectName: "Task", displayName: "Tasks" },
      { objectName: "Event", displayName: "Events" },
      { objectName: "Product", displayName: "Products" },
      { objectName: "Pricebook", displayName: "Pricebooks" },
    ];
  },

  // Helper to check if an object uses parent-controlled access
  isControlledByParent(owd: OrgWideDefault): boolean {
    return owd.internalAccess === "ControlledByParent";
  },

  // Helper to check if public access is enabled
  isPublicAccess(owd: OrgWideDefault): boolean {
    return owd.internalAccess === "PublicReadOnly" || owd.internalAccess === "PublicReadWrite";
  },

  // Helper to check if public write is enabled
  isPublicWrite(owd: OrgWideDefault): boolean {
    return owd.internalAccess === "PublicReadWrite";
  },
};
