import assert from "node:assert/strict";
import test from "node:test";

const { default: pool } = await import("../db/database.js");
const { default: userModel } = await import("../models/RegisterModel.js");

test("selectUserByEmail usa o schema legado quando faltam colunas opcionais", { concurrency: false }, async () => {
  const originalExecute = pool.execute;
  const calls = [];

  pool.execute = async (query, params) => {
    calls.push({ query, params });
    if (calls.length <= 2) {
      const error = new Error(calls.length === 1 ? "tabela não encontrada" : "colunas não encontradas");
      error.code = calls.length === 1 ? "ER_NO_SUCH_TABLE" : "ER_BAD_FIELD_ERROR";
      throw error;
    }
    return [[{
      user_id: 3,
      user_name: "Usuário Legado",
      user_email: "legado@example.com",
      user_password: "$2b$04$hash",
      role_id: 1,
      user_status: 1,
      role_name: "user",
    }], []];
  };

  try {
    const rows = await userModel.selectUserByEmail("legado@example.com");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_email, "legado@example.com");
    assert.equal(calls.length, 3);
    assert.match(calls[0].query, /LEFT JOIN roles/);
    assert.match(calls[1].query, /u\.role_id/);
    assert.match(calls[2].query, /1 AS role_id/);
  } finally {
    pool.execute = originalExecute;
  }
});

test("insertUser não depende da tabela roles e usa INSERT mínimo no schema legado", { concurrency: false }, async () => {
  const originalExecute = pool.execute;
  const calls = [];

  pool.execute = async (query, params) => {
    calls.push({ query, params });
    if (calls.length === 1) {
      const error = new Error("tabela não encontrada");
      error.code = "ER_NO_SUCH_TABLE";
      throw error;
    }
    if (calls.length === 2) {
      const error = new Error("colunas não encontradas");
      error.code = "ER_BAD_FIELD_ERROR";
      throw error;
    }
    return [{ affectedRows: 1, insertId: 9 }, []];
  };

  try {
    const result = await userModel.insertUser({
      user_name: "Usuário Novo",
      user_email: "novo@example.com",
      user_password: "$2b$04$hash",
    });

    assert.equal(result.affectedRows, 1);
    assert.equal(result.insertId, 9);
    assert.equal(calls.length, 3);
    assert.match(calls[0].query, /FROM roles/);
    assert.match(calls[1].query, /role_id, user_status/);
    assert.match(calls[2].query, /INSERT INTO users \(user_name, user_email, user_password\)/);
    assert.deepEqual(calls[2].params, ["Usuário Novo", "novo@example.com", "$2b$04$hash"]);
  } finally {
    pool.execute = originalExecute;
  }
});
