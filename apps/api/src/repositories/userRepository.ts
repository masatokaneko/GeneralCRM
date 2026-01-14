import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  PaginatedResponse,
} from "../types/index.js";

interface ListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  isActive?: boolean;
  roleId?: string;
  profileId?: string;
  managerId?: string;
  department?: string;
}

export class UserRepository {
  async findById(tenantId: string, id: string): Promise<User | null> {
    const sql = `
      SELECT
        u.id,
        u.tenant_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.display_name,
        u.phone,
        u.mobile_phone,
        u.title,
        u.department,
        u.manager_id,
        u.role_id,
        u.profile_id,
        u.timezone,
        u.locale,
        u.photo_url,
        u.about_me,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.is_deleted,
        u.system_modstamp,
        m.display_name as manager_name,
        r.name as role_name,
        pp.name as profile_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN permission_profiles pp ON u.profile_id = pp.id
      WHERE u.tenant_id = $1 AND u.id = $2 AND u.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<User> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError("users", id);
    }
    return record;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const sql = `
      SELECT
        u.id,
        u.tenant_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.display_name,
        u.phone,
        u.mobile_phone,
        u.title,
        u.department,
        u.manager_id,
        u.role_id,
        u.profile_id,
        u.timezone,
        u.locale,
        u.photo_url,
        u.about_me,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.is_deleted,
        u.system_modstamp,
        m.display_name as manager_name,
        r.name as role_name,
        pp.name as profile_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN permission_profiles pp ON u.profile_id = pp.id
      WHERE u.tenant_id = $1 AND u.email = $2 AND u.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, email]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async list(
    tenantId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<User>> {
    const { limit = 50, cursor, search, isActive, roleId, profileId, managerId, department } = params;

    const conditions: string[] = ["u.tenant_id = $1", "u.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions.push(
        `(u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (roleId) {
      conditions.push(`u.role_id = $${paramIndex}`);
      values.push(roleId);
      paramIndex++;
    }

    if (profileId) {
      conditions.push(`u.profile_id = $${paramIndex}`);
      values.push(profileId);
      paramIndex++;
    }

    if (managerId) {
      conditions.push(`u.manager_id = $${paramIndex}`);
      values.push(managerId);
      paramIndex++;
    }

    if (department) {
      conditions.push(`u.department = $${paramIndex}`);
      values.push(department);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`u.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) FROM users u WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Select
    const sql = `
      SELECT
        u.id,
        u.tenant_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.display_name,
        u.phone,
        u.mobile_phone,
        u.title,
        u.department,
        u.manager_id,
        u.role_id,
        u.profile_id,
        u.timezone,
        u.locale,
        u.photo_url,
        u.about_me,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.is_deleted,
        u.system_modstamp,
        m.display_name as manager_name,
        r.name as role_name,
        pp.name as profile_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN permission_profiles pp ON u.profile_id = pp.id
      WHERE ${whereClause}
      ORDER BY u.display_name ASC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  }

  /**
   * Get direct reports for a manager
   */
  async findByManagerId(tenantId: string, managerId: string): Promise<User[]> {
    const sql = `
      SELECT
        u.id,
        u.tenant_id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.display_name,
        u.phone,
        u.mobile_phone,
        u.title,
        u.department,
        u.manager_id,
        u.role_id,
        u.profile_id,
        u.timezone,
        u.locale,
        u.photo_url,
        u.about_me,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.is_deleted,
        u.system_modstamp,
        r.name as role_name,
        pp.name as profile_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN permission_profiles pp ON u.profile_id = pp.id
      WHERE u.tenant_id = $1 AND u.manager_id = $2 AND u.is_deleted = false
      ORDER BY u.display_name ASC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, managerId]);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async create(
    tenantId: string,
    data: CreateUserInput
  ): Promise<User> {
    // Check for duplicate email
    const existsCheck = await query<{ id: string }>(
      `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND is_deleted = false`,
      [tenantId, data.email]
    );

    if (existsCheck.rows.length > 0) {
      throw new ValidationError([
        { field: "email", message: "A user with this email already exists." },
      ]);
    }

    // Check for duplicate username if provided
    if (data.username) {
      const usernameCheck = await query<{ id: string }>(
        `SELECT id FROM users WHERE tenant_id = $1 AND username = $2 AND is_deleted = false`,
        [tenantId, data.username]
      );

      if (usernameCheck.rows.length > 0) {
        throw new ValidationError([
          { field: "username", message: "A user with this username already exists." },
        ]);
      }
    }

    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Generate display name if not provided
    const displayName = data.displayName ||
      (data.firstName ? `${data.firstName} ${data.lastName}` : data.lastName);

    // Generate username if not provided
    const username = data.username || data.email.split("@")[0];

    const sql = `
      INSERT INTO users (
        id, tenant_id, email, username, first_name, last_name, display_name,
        phone, mobile_phone, title, department, manager_id, role_id, profile_id,
        timezone, locale, photo_url, about_me, is_active,
        created_at, updated_at, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING id
    `;

    await query(sql, [
      id,
      tenantId,
      data.email,
      username,
      data.firstName || null,
      data.lastName,
      displayName,
      data.phone || null,
      data.mobilePhone || null,
      data.title || null,
      data.department || null,
      data.managerId || null,
      data.roleId || null,
      data.profileId || null,
      data.timezone || "Asia/Tokyo",
      data.locale || "ja_JP",
      data.photoUrl || null,
      data.aboutMe || null,
      data.isActive ?? true,
      now,
      now,
      false,
      systemModstamp,
    ]);

    return this.findById(tenantId, id) as Promise<User>;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateUserInput,
    etag?: string
  ): Promise<User> {
    const existing = await this.findByIdOrThrow(tenantId, id);

    if (etag && existing.systemModstamp !== etag) {
      throw new ConflictError(`User ${id} was modified by another user`);
    }

    // Check for duplicate email if changing
    if (data.email && data.email !== existing.email) {
      const existsCheck = await query<{ id: string }>(
        `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND id != $3 AND is_deleted = false`,
        [tenantId, data.email, id]
      );

      if (existsCheck.rows.length > 0) {
        throw new ValidationError([
          { field: "email", message: "A user with this email already exists." },
        ]);
      }
    }

    // Check for duplicate username if changing
    if (data.username && data.username !== existing.username) {
      const usernameCheck = await query<{ id: string }>(
        `SELECT id FROM users WHERE tenant_id = $1 AND username = $2 AND id != $3 AND is_deleted = false`,
        [tenantId, data.username, id]
      );

      if (usernameCheck.rows.length > 0) {
        throw new ValidationError([
          { field: "username", message: "A user with this username already exists." },
        ]);
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields: Array<{ key: keyof UpdateUserInput; dbColumn: string }> = [
      { key: "email", dbColumn: "email" },
      { key: "username", dbColumn: "username" },
      { key: "firstName", dbColumn: "first_name" },
      { key: "lastName", dbColumn: "last_name" },
      { key: "displayName", dbColumn: "display_name" },
      { key: "phone", dbColumn: "phone" },
      { key: "mobilePhone", dbColumn: "mobile_phone" },
      { key: "title", dbColumn: "title" },
      { key: "department", dbColumn: "department" },
      { key: "managerId", dbColumn: "manager_id" },
      { key: "roleId", dbColumn: "role_id" },
      { key: "profileId", dbColumn: "profile_id" },
      { key: "timezone", dbColumn: "timezone" },
      { key: "locale", dbColumn: "locale" },
      { key: "photoUrl", dbColumn: "photo_url" },
      { key: "aboutMe", dbColumn: "about_me" },
      { key: "isActive", dbColumn: "is_active" },
    ];

    for (const { key, dbColumn } of fields) {
      if (data[key] !== undefined) {
        updates.push(`${dbColumn} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    // Update display_name if first/last name changed but displayName not explicitly set
    if ((data.firstName !== undefined || data.lastName !== undefined) && data.displayName === undefined) {
      const newFirstName = data.firstName ?? existing.firstName;
      const newLastName = data.lastName ?? existing.lastName;
      const newDisplayName = newFirstName ? `${newFirstName} ${newLastName}` : newLastName;
      updates.push(`display_name = $${paramIndex}`);
      values.push(newDisplayName);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`system_modstamp = uuid_generate_v4()`);

    values.push(tenantId, id);

    const sql = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} AND is_deleted = false
      RETURNING id
    `;

    await query(sql, values);
    return this.findById(tenantId, id) as Promise<User>;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(tenantId, id);

    const sql = `
      UPDATE users
      SET is_deleted = true, updated_at = NOW(), system_modstamp = uuid_generate_v4()
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    await query(sql, [tenantId, id]);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(tenantId: string, id: string): Promise<void> {
    const sql = `
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    await query(sql, [tenantId, id]);
  }

  private mapFromDb(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      email: row.email as string,
      username: row.username as string | undefined,
      firstName: row.first_name as string | undefined,
      lastName: row.last_name as string,
      displayName: row.display_name as string,
      phone: row.phone as string | undefined,
      mobilePhone: row.mobile_phone as string | undefined,
      title: row.title as string | undefined,
      department: row.department as string | undefined,
      managerId: row.manager_id as string | undefined,
      roleId: row.role_id as string | undefined,
      profileId: row.profile_id as string | undefined,
      timezone: (row.timezone as string) || "Asia/Tokyo",
      locale: (row.locale as string) || "ja_JP",
      photoUrl: row.photo_url as string | undefined,
      aboutMe: row.about_me as string | undefined,
      isActive: row.is_active as boolean,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      managerName: row.manager_name as string | undefined,
      roleName: row.role_name as string | undefined,
      profileName: row.profile_name as string | undefined,
    };
  }
}

export const userRepository = new UserRepository();
