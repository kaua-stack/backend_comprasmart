import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.CORS_ORIGINS = "http://localhost:5173";

const { default: app } = await import("../app.js");
const { default: validateLogin } = await import("../middlewares/LoginMiddleware.js");
const { default: generateTokens } = await import("../utils/generateTokken.js");
const { authenticationToken } = await import("../middlewares/authLoginMiddleware.js");

let server;
let baseUrl;

before(async () => {
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  server.unref();
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("health check responde 200", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("preflight permitido retorna CORS com credenciais", async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("validação de login rejeita campos ausentes", () => {
  let statusCode;
  let payload;
  let nextCalled = false;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  validateLogin({ body: {} }, response, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 400);
  assert.deepEqual(payload, { error: "O e-mail é obrigatório" });
  assert.equal(nextCalled, false);
});

test("tokens de acesso carregam identidade e podem ser validados", () => {
  const user = { user_id: 7, user_email: "user@example.com", role_id: 1 };
  const token = generateTokens.generateAccessToken(user);
  let authenticatedUser;
  let statusCode;

  authenticationToken(
    { headers: { authorization: `Bearer ${token}` } },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    },
    () => {},
  );

  assert.equal(statusCode, undefined);
  assert.ok(token);

  authenticationToken(
    { headers: { authorization: `Bearer ${token}` } },
    {},
    function next() {
      authenticatedUser = true;
    },
  );

  assert.equal(authenticatedUser, true);
});


test("cadastro e login percorrem o fluxo HTTP esperado", { concurrency: false }, async () => {
  const { default: bcrypt } = await import("bcrypt");
  const { default: usersModel } = await import("../models/RegisterModel.js");
  const { default: tokenModel } = await import("../models/tokenModel.js");
  const passwordHash = await bcrypt.hash("Senha@123", 4);
  const user = {
    user_id: 7,
    user_name: "Usuário Teste",
    user_email: "user@example.com",
    user_password: passwordHash,
    role_id: 1,
    role_name: "user",
    user_status: 1,
  };
  const originalSelectByEmail = usersModel.selectUserByEmail;
  const originalInsertUser = usersModel.insertUser;
  const originalCreateToken = tokenModel.createToken;

  usersModel.selectUserByEmail = async () => [];
  usersModel.insertUser = async () => ({ affectedRows: 1, insertId: 7 });
  tokenModel.createToken = async () => ({ affectedRows: 1 });

  try {
    const registerResponse = await fetch(`${baseUrl}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: "Usuário Teste",
        user_email: "user@example.com",
        user_password: "Senha@123",
      }),
    });

    assert.equal(registerResponse.status, 201);
    assert.equal((await registerResponse.json()).user_id, 7);

    usersModel.selectUserByEmail = async () => [user];
    const loginResponse = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: "user@example.com",
        user_password: "Senha@123",
      }),
    });

    assert.equal(loginResponse.status, 200);
    assert.ok((await loginResponse.json()).accessToken);
    assert.match(loginResponse.headers.get("set-cookie") || "", /refreshToken=/);
  } finally {
    usersModel.selectUserByEmail = originalSelectByEmail;
    usersModel.insertUser = originalInsertUser;
    tokenModel.createToken = originalCreateToken;
  }
});
