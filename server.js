import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import userRoute from "./routes/RegisterRouter.js";
import loginRoute from "./routes/LoginRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

app.use(cookieParser());

// Rotas
app.use("/user",userRoute);
app.use(loginRoute);

const PORT = process.env.PORT_SERVER || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});