import jwt from "jsonwebtoken";
import "dotenv/config";

export function verifyToken(req, res, next) {
  try {
    // 1. Read token from the "token" cookie OR the Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    //console.log("token:",token);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // 2. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach the user payload (id, email) to the token
    console.log("decoded:",decoded);
    req.user = decoded;

    // 4. Proceed to the next function 
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}


