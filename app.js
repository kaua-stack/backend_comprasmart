import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import userRoute from "./routes/RegisterRouter.js";
import loginRoute from "./routes/LoginRoutes.js";
import shoppingRoute from "./routes/ShoppingRoutes.js";
import profileRoute from "./routes/ProfileRoutes.js";

dotenv.config();

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

export const corsOptions = {
  origin(origin, callback) {
    // Permite chamadas sem header Origin, como curl, testes e aplicações server-to-server.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origem não autorizada pelo CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
};

const app = express();

app.disable("x-powered-by");
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/user", userRoute);
app.use(loginRoute);
app.use("/api", shoppingRoute);
app.use("/users", profileRoute);

app.use((error, _req, res, _next) => {
  if (error?.message?.startsWith("Origem não autorizada pelo CORS:")) {
    return res.status(403).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
