import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

export function authenticationToken(req, res, next) {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(" ") || [];

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Token Bearer não fornecido" });
  }

  try {
    req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }

    return res.status(403).json({ error: "Token inválido" });
  }
}

export function adminRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (!allowedRoles.map(String).includes(String(req.user.role))) {
      return res.status(403).json({ error: "Acesso negado. Função não autorizada" });
    }

    return next();
  };
}

export default { authenticationToken, adminRole };
