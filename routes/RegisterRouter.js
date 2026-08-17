import express from "express";

import usersController from "../controllers/RegisterController.js";
import validateUser, { validateUserUpdate } from "../middlewares/RegisterMiddleware.js";
import { authenticationToken } from "../middlewares/authLoginMiddleware.js";

const userRouter = express.Router();

userRouter.get("/", authenticationToken, usersController.getAllUsers);
userRouter.get("/user_id/:user_id", authenticationToken, usersController.getUserById);
userRouter.get("/user_email/:user_email", authenticationToken, usersController.getUserByEmail);
userRouter.post("/", validateUser, usersController.createUser);
userRouter.put("/:user_id", authenticationToken, validateUserUpdate, usersController.updateUser);
userRouter.delete("/:user_id", authenticationToken, usersController.deleteUser);

export default userRouter;
