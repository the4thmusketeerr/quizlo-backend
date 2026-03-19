import { Router } from "express";
import { getImageKitAuth } from "../controllers/media.js";
import { verifyToken } from "../middleware/token.js";

const router = Router();

// Route to get ImageKit authentication parameters
router.get("/auth", verifyToken, getImageKitAuth);

export default router;
