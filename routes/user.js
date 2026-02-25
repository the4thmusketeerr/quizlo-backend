import { getUser, updateProfile, changePassword } from "../controllers/user.js";
import { verifyToken } from "../middleware/token.js";
import { Router } from "express";

const userRouter = Router();

userRouter.get("/profile", verifyToken, getUser);
userRouter.patch("/profile", verifyToken, updateProfile);
userRouter.patch("/password", verifyToken, changePassword);

export default userRouter;
