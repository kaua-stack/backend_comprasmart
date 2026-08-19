import express from "express";

import profileController from "../controllers/ProfileController.js";
import { authenticationToken } from "../middlewares/authLoginMiddleware.js";

const profileRouter = express.Router();

profileRouter.get("/profile", authenticationToken, profileController.getProfile);

export default profileRouter;
