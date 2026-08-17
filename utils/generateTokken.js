import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

function requiredSecret(name) {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} não configurado`);
  }
  return secret;
}

class GenerateTokens {
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.user_id,
        email: user.user_email,
        role: user.role_name ?? user.role_id ?? "user",
      },
      requiredSecret("ACCESS_TOKEN_SECRET"),
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" },
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.user_id },
      requiredSecret("REFRESH_TOKEN_SECRET"),
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" },
    );
  }
}

export default new GenerateTokens();
