import express from "express";

import authLoginController from "../controllers/authLoginController.js";
import validateLogin from "../middlewares/LoginMiddleware.js";

const loginRoute = express.Router();

loginRoute.post("/login", validateLogin, authLoginController.login);
loginRoute.post("/login/google", authLoginController.googleLogin);
loginRoute.post("/logout", authLoginController.logout);
loginRoute.post("/refresh", authLoginController.refreshToken);

export default loginRoute;
