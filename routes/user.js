import {
  getUser,
  getUserById,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  getUserQuizzes,
  getUserDashboard,
  rateQuiz
} from "../controllers/user.js";
import { verifyToken } from "../middleware/token.js";
import { upload } from "../middleware/upload.js";
import { Router } from "express";

const userRouter = Router();

userRouter.get("/me", verifyToken, getUser);
userRouter.get("/profile/:id", getUserById);
userRouter.patch("/profile", verifyToken, updateProfile);
userRouter.patch("/change-password", verifyToken, changePassword);
userRouter.get("/quizzes", verifyToken, getUserQuizzes);
userRouter.get("/dashboard", verifyToken, getUserDashboard);
userRouter.post("/rate-quiz", verifyToken, rateQuiz);
userRouter.patch(
  "/profile-picture",
  verifyToken,
  upload().single("profilePicture"),
  uploadProfilePicture,
);
userRouter.delete("/profile-picture", verifyToken, deleteProfilePicture);

export default userRouter;
