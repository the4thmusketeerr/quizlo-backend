import {
  getUser,
  updateProfile,
  changePassword,
  uploadProfilePicture,
} from "../controllers/user.js";
import { verifyToken } from "../middleware/token.js";
import { upload } from "../middleware/upload.js";
import { Router } from "express";

const userRouter = Router();

userRouter.get("/profile", verifyToken, getUser);
userRouter.patch("/profile", verifyToken, updateProfile);
userRouter.patch("/change-password", verifyToken, changePassword);
userRouter.patch(
  "/profile-picture",
  verifyToken,
  upload().single("profilePicture"),
  uploadProfilePicture,
);

export default userRouter;
