import pool from "../db/database.js";

class TokenModel {
  async createToken({ token, user_id, expires_at }) {
    if (!token || !user_id || !expires_at) {
      throw new Error("Dados incompletos para criar token");
    }

    const [result] = await pool.execute(
      "INSERT INTO tokens (token, expires_at, user_id) VALUES (?, ?, ?)",
      [token, expires_at, user_id],
    );
    return result;
  }

  async selectByToken(token) {
    if (!token) return [];

    const [rows] = await pool.execute(
      "SELECT token, user_id, expires_at FROM tokens WHERE token = ? LIMIT 1",
      [token],
    );
    return rows;
  }

  async deleteToken(token) {
    if (!token) return { affectedRows: 0 };

    const [result] = await pool.execute("DELETE FROM tokens WHERE token = ?", [token]);
    return result;
  }
}

export default new TokenModel();
