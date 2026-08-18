import pool from "../db/database.js";

const USER_FIELDS_WITH_ROLE = `
  u.user_id,
  u.user_name,
  u.user_email,
  u.user_password,
  u.role_id,
  u.user_status,
  COALESCE(r.role_name, CAST(u.role_id AS CHAR)) AS role_name
`;

const CORE_USER_FIELDS = `
  u.user_id,
  u.user_name,
  u.user_email,
  u.user_password,
  u.role_id,
  u.user_status,
  CAST(u.role_id AS CHAR) AS role_name
`;

const LEGACY_USER_FIELDS = `
  u.user_id,
  u.user_name,
  u.user_email,
  u.user_password,
  1 AS role_id,
  1 AS user_status,
  'user' AS role_name
`;

const DEFAULT_USER_ROLE_ID = 2;

const OPTIONAL_SCHEMA_ERRORS = new Set([
  "ER_BAD_FIELD_ERROR",
  "ER_NO_SUCH_TABLE",
  "ER_NO_SUCH_COLUMN",
]);

function isOptionalSchemaError(error) {
  return OPTIONAL_SCHEMA_ERRORS.has(error?.code);
}

async function executeUserQuery(where = "", params = [], schema = "with-role") {
  const fields = schema === "with-role"
    ? USER_FIELDS_WITH_ROLE
    : schema === "core"
      ? CORE_USER_FIELDS
      : LEGACY_USER_FIELDS;
  const from = schema === "with-role"
    ? "users u LEFT JOIN roles r ON r.role_id = u.role_id"
    : "users u";

  const query = `
    SELECT ${fields}
    FROM ${from}
    ${where}
  `;

  return pool.execute(query, params);
}

async function selectUsers(where = "", params = []) {
  try {
    return await executeUserQuery(where, params, "with-role");
  } catch (error) {
    if (!isOptionalSchemaError(error)) throw error;

    try {
      return await executeUserQuery(where, params, "core");
    } catch (coreError) {
      // Bancos criados antes do patch podem ter somente as três colunas básicas.
      if (isOptionalSchemaError(coreError)) {
        return executeUserQuery(where, params, "legacy");
      }
      throw coreError;
    }
  }
}

async function findDefaultUserRoleId() {
  try {
    const [rows] = await pool.execute(
      "SELECT role_id FROM roles WHERE LOWER(role_name) = 'user' LIMIT 1",
    );
    return rows[0]?.role_id ?? null;
  } catch (error) {
    // O cadastro normal não deve depender da tabela opcional de roles.
    if (isOptionalSchemaError(error)) return null;
    throw error;
  }
}

const userModel = {
  async selectAllUsers() {
    const [rows] = await selectUsers("ORDER BY u.user_id DESC");
    return rows;
  },

  async selectUserById(userId) {
    const [rows] = await selectUsers("WHERE u.user_id = ? LIMIT 1", [userId]);
    return rows;
  },

  async selectUserByEmail(email, excludedUserId = null) {
    const where = ["WHERE LOWER(u.user_email) = LOWER(?)"];
    const params = [email];

    if (excludedUserId !== null && excludedUserId !== undefined) {
      where.push("AND u.user_id <> ?");
      params.push(excludedUserId);
    }

    where.push("LIMIT 1");
    return selectUsers(where.join(" "), params).then(([rows]) => rows);
  },

  async selectUserByGoogleId(googleId) {
    try {
      const [rows] = await pool.execute(
        `SELECT ${CORE_USER_FIELDS}, u.user_google_id
         FROM users u
         WHERE u.user_google_id = ?
         LIMIT 1`,
        [googleId],
      );
      return rows;
    } catch (error) {
      // Login por e-mail continua funcional em schemas sem suporte ao Google.
      if (isOptionalSchemaError(error)) return [];
      throw error;
    }
  },

  async insertUser({ user_name, user_email, user_password, role_id = null, user_status = 1 }) {
    const defaultRoleId = role_id ?? (await findDefaultUserRoleId()) ?? DEFAULT_USER_ROLE_ID;

    if (defaultRoleId !== null) {
      try {
        const [result] = await pool.execute(
          `INSERT INTO users
            (user_name, user_email, user_password, role_id, user_status)
           VALUES (?, ?, ?, ?, ?)`,
          [user_name, user_email, user_password, defaultRoleId, user_status],
        );
        return result;
      } catch (error) {
        // Continua para o INSERT mínimo quando o banco ainda é legado.
        if (!isOptionalSchemaError(error)) throw error;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO users (user_name, user_email, user_password)
       VALUES (?, ?, ?)`,
      [user_name, user_email, user_password],
    );
    return result;
  },

  async insertGoogleUser({
    user_name,
    user_email,
    user_google_id,
    role_id = null,
    user_status = 1,
  }) {
    const defaultRoleId = role_id ?? (await findDefaultUserRoleId()) ?? DEFAULT_USER_ROLE_ID;
    if (defaultRoleId === null) {
      throw Object.assign(new Error("Login Google exige o schema completo de usuários"), {
        code: "GOOGLE_SCHEMA_NOT_CONFIGURED",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO users
        (user_name, user_email, user_google_id, role_id, user_status)
       VALUES (?, ?, ?, ?, ?)`,
      [user_name, user_email, user_google_id, defaultRoleId, user_status],
    );
    return result;
  },

  async linkGoogleAccount(userId, googleId) {
    const [result] = await pool.execute(
      "UPDATE users SET user_google_id = ? WHERE user_id = ?",
      [googleId, userId],
    );
    return result;
  },

  async updateUser(userId, { user_name, user_email, user_password }) {
    const [result] = await pool.execute(
      `UPDATE users
       SET user_name = ?, user_email = ?, user_password = ?
       WHERE user_id = ?`,
      [user_name, user_email, user_password, userId],
    );
    return result;
  },

  async deleteUser(userId) {
    const [result] = await pool.execute("DELETE FROM users WHERE user_id = ?", [userId]);
    return result;
  },
};

export default userModel;
