import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import generateTokens from "../utils/generateTokken.js";
import usersModel from "../models/RegisterModel.js";
import tokenModel from "../models/tokenModel.js";

dotenv.config();

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const DEFAULT_GOOGLE_ROLE_ID = 1;

function refreshCookieOptions() {
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  const configuredSameSite = (process.env.COOKIE_SAMESITE || "").toLowerCase();
  const requestedSameSite = configuredSameSite || (secure ? "none" : "lax");
  const sameSite = requestedSameSite === "none" && !secure ? "lax" : requestedSameSite;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  };
}

function clearRefreshCookie(res) {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie("refreshToken", options);
}

async function issueSession(res, user) {
  const accessToken = generateTokens.generateAccessToken(user);
  const refreshToken = generateTokens.generateRefreshToken(user);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

  const savedToken = await tokenModel.createToken({
    user_id: user.user_id,
    token: refreshToken,
    expires_at: expiresAt,
  });

  if (savedToken.affectedRows !== 1) {
    throw new Error("Não foi possível salvar o token de refresh");
  }

  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
  return accessToken;
}

class AuthLoginController {
  async login(req, res) {
    try {
      const userEmail = req.body.user_email.trim().toLowerCase();
      const userPassword = req.body.user_password;
      const [user] = await usersModel.selectUserByEmail(userEmail);

      if (!user || user.user_status === 0) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      const passwordIsValid = await bcrypt.compare(userPassword, user.user_password);
      if (!passwordIsValid) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      const accessToken = await issueSession(res, user);
      return res.status(200).json({
        success: "Login bem-sucedido",
        accessToken,
      });
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      return res.status(500).json({ error: "Erro ao realizar login" });
    }
  }

  async googleLogin(req, res) {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: "Login com Google não configurado" });
      }

      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: "Credencial do Google não fornecida" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload?.email_verified) {
        return res.status(401).json({ error: "E-mail do Google não verificado" });
      }

      const { sub: googleId, email, name } = payload;
      let [user] = await usersModel.selectUserByGoogleId(googleId);

      if (!user) {
        const [userByEmail] = await usersModel.selectUserByEmail(email);

        if (userByEmail) {
          await usersModel.linkGoogleAccount(userByEmail.user_id, googleId);
          user = { ...userByEmail, user_google_id: googleId };
        } else {
          const newUser = await usersModel.insertGoogleUser({
            user_name: name || email.split("@")[0],
            user_email: email.toLowerCase(),
            user_google_id: googleId,
            role_id: DEFAULT_GOOGLE_ROLE_ID,
            user_status: 1,
          });

          if (newUser.affectedRows !== 1) {
            return res.status(500).json({ error: "Erro ao cadastrar usuário via Google" });
          }

          [user] = await usersModel.selectUserByGoogleId(googleId);
        }
      }

      const accessToken = await issueSession(res, user);
      return res.status(200).json({
        success: "Login com Google realizado com sucesso",
        accessToken,
      });
    } catch (error) {
      console.error("Erro no login com Google:", error);
      return res.status(401).json({ error: "Token do Google inválido" });
    }
  }

  async refreshToken(req, res) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Token de refresh não encontrado" });
    }

    try {
      const [storedToken] = await tokenModel.selectByToken(refreshToken);
      if (!storedToken) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: "Token de refresh inválido" });
      }

      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const [user] = await usersModel.selectUserById(storedToken.user_id || decoded.id);

      if (!user || user.user_status === 0) {
        await tokenModel.deleteToken(refreshToken);
        clearRefreshCookie(res);
        return res.status(401).json({ error: "Usuário da sessão não encontrado" });
      }

      await tokenModel.deleteToken(refreshToken);
      const accessToken = await issueSession(res, user);

      return res.status(200).json({
        success: "Sessão atualizada com sucesso",
        accessToken,
      });
    } catch (error) {
      console.error("Erro ao renovar sessão:", error);
      clearRefreshCookie(res);

      if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
        return res.status(403).json({ error: "Token de refresh inválido ou expirado" });
      }

      return res.status(500).json({ error: "Erro ao renovar sessão" });
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await tokenModel.deleteToken(refreshToken);
      }

      clearRefreshCookie(res);
      return res.status(200).json({ success: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Erro ao realizar logout:", error);
      clearRefreshCookie(res);
      return res.status(500).json({ error: "Erro ao realizar logout" });
    }
  }
}

export default new AuthLoginController();
