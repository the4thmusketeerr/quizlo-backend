import { signupUser, loginUser, logoutUser, forgotPassword, resetPassword } from "../controllers/auth.js";
import { verifyToken } from "../middleware/token.js";
import { Router } from "express";

const authRouter = Router();

authRouter.post("/signup", signupUser);
authRouter.post("/login", loginUser);
authRouter.get("/logout", verifyToken, logoutUser);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
