import pool from "../db/database.js";

const USER_FIELDS = `
  u.user_id,
  u.user_name,
  u.user_email,
  u.user_password,
  u.role_id,
  u.user_status,
  u.user_google_id,
  COALESCE(r.role_name, CAST(u.role_id AS CHAR)) AS role_name
`;

const FALLBACK_USER_FIELDS = `
  user_id,
  user_name,
  user_email,
  user_password,
  role_id,
  user_status,
  user_google_id,
  CAST(role_id AS CHAR) AS role_name
`;

async function executeUserQuery(where = "", params = [], options = {}) {
  const query = `
    SELECT ${options.fallback ? FALLBACK_USER_FIELDS : USER_FIELDS}
    FROM ${options.fallback ? "users" : "users u LEFT JOIN roles r ON r.role_id = u.role_id"}
    ${where}
  `;

  return pool.execute(query, params);
}

async function selectUsers(where = "", params = []) {
  try {
    return await executeUserQuery(where, params);
  } catch (error) {
    // Permite o funcionamento em bancos que ainda não possuem a tabela roles.
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error.code)) {
      return executeUserQuery(where.replaceAll("u.", ""), params, { fallback: true });
    }
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
    return selectUsers("WHERE u.user_google_id = ? LIMIT 1", [googleId]).then(([rows]) => rows);
  },

  async insertUser({ user_name, user_email, user_password, role_id = 1, user_status = 1 }) {
    const [result] = await pool.execute(
      `INSERT INTO users
        (user_name, user_email, user_password, role_id, user_status)
       VALUES (?, ?, ?, ?, ?)`,
      [user_name, user_email, user_password, role_id, user_status],
    );
    return result;
  },

  async insertGoogleUser({
    user_name,
    user_email,
    user_google_id,
    role_id = 1,
    user_status = 1,
  }) {
    const [result] = await pool.execute(
      `INSERT INTO users
        (user_name, user_email, user_google_id, role_id, user_status)
       VALUES (?, ?, ?, ?, ?)`,
      [user_name, user_email, user_google_id, role_id, user_status],
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
