import { Router } from "express";
import { query } from "../db/connection.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

interface SearchResult {
  id: string;
  type: "account" | "contact" | "lead" | "opportunity" | "quote";
  name: string;
  subtitle?: string;
}

// Global search across all objects
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, types, limit = "20" } = req.query;
    const tenantId = req.context!.tenantId;
    const searchTerm = `%${(q as string) || ""}%`;
    const maxLimit = Math.min(Number(limit), 100);

    const allowedTypes = types
      ? (types as string).split(",")
      : ["account", "contact", "lead", "opportunity", "quote"];

    const results: SearchResult[] = [];

    // Search accounts
    if (allowedTypes.includes("account")) {
      const accountsResult = await query(
        `SELECT id, name, industry
         FROM accounts
         WHERE tenant_id = $1 AND is_deleted = false
         AND (name ILIKE $2 OR industry ILIKE $2)
         LIMIT $3`,
        [tenantId, searchTerm, maxLimit]
      );
      for (const row of accountsResult.rows) {
        results.push({
          id: row.id,
          type: "account",
          name: row.name,
          subtitle: row.industry,
        });
      }
    }

    // Search contacts
    if (allowedTypes.includes("contact")) {
      const contactsResult = await query(
        `SELECT id, first_name, last_name, email, title
         FROM contacts
         WHERE tenant_id = $1 AND is_deleted = false
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
         LIMIT $3`,
        [tenantId, searchTerm, maxLimit]
      );
      for (const row of contactsResult.rows) {
        results.push({
          id: row.id,
          type: "contact",
          name: `${row.first_name || ""} ${row.last_name}`.trim(),
          subtitle: row.title || row.email,
        });
      }
    }

    // Search leads
    if (allowedTypes.includes("lead")) {
      const leadsResult = await query(
        `SELECT id, first_name, last_name, company, email
         FROM leads
         WHERE tenant_id = $1 AND is_deleted = false AND is_converted = false
         AND (first_name ILIKE $2 OR last_name ILIKE $2 OR company ILIKE $2 OR email ILIKE $2)
         LIMIT $3`,
        [tenantId, searchTerm, maxLimit]
      );
      for (const row of leadsResult.rows) {
        results.push({
          id: row.id,
          type: "lead",
          name: `${row.first_name || ""} ${row.last_name}`.trim(),
          subtitle: row.company,
        });
      }
    }

    // Search opportunities
    if (allowedTypes.includes("opportunity")) {
      const opportunitiesResult = await query(
        `SELECT o.id, o.name, o.stage_name, a.name as account_name
         FROM opportunities o
         LEFT JOIN accounts a ON o.account_id = a.id AND a.tenant_id = o.tenant_id
         WHERE o.tenant_id = $1 AND o.is_deleted = false
         AND (o.name ILIKE $2)
         LIMIT $3`,
        [tenantId, searchTerm, maxLimit]
      );
      for (const row of opportunitiesResult.rows) {
        results.push({
          id: row.id,
          type: "opportunity",
          name: row.name,
          subtitle: `${row.account_name || ""} - ${row.stage_name}`,
        });
      }
    }

    // Search quotes
    if (allowedTypes.includes("quote")) {
      const quotesResult = await query(
        `SELECT q.id, q.name, q.status, o.name as opportunity_name
         FROM quotes q
         LEFT JOIN opportunities o ON q.opportunity_id = o.id AND o.tenant_id = q.tenant_id
         WHERE q.tenant_id = $1 AND q.is_deleted = false
         AND (q.name ILIKE $2)
         LIMIT $3`,
        [tenantId, searchTerm, maxLimit]
      );
      for (const row of quotesResult.rows) {
        results.push({
          id: row.id,
          type: "quote",
          name: row.name,
          subtitle: `${row.opportunity_name || ""} - ${row.status}`,
        });
      }
    }

    // Sort by relevance (exact matches first, then partial)
    const searchLower = ((q as string) || "").toLowerCase();
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchLower;
      const bExact = b.name.toLowerCase() === searchLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      data: results.slice(0, maxLimit),
      total: results.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
