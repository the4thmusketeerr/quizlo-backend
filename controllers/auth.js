import { prisma } from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateId } from "../utils/id.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

/**
 * Register a new user
 * @route POST /auth/signup
 */
async function signupUser(req, res) {
  try {
    // Extract user data from request body
    const data = req.body;

    // Validate required fields
    if (!data) {
      return res.status(400).json({
        success: false,
        error: "Fill in all required fields",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Generate a unique ID for the user
    const id = generateId("user");

    // Create user using Prisma
    const newUser = await prisma.user.create({
      data: {
        id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        username: data.username,
        password: await hashPassword(data.password),
      },
    });

    // Remove password from response
    delete newUser.password;

    // Return success response
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle unique constraint violations (duplicate email or id)
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "User with this email or username already exists",
      });
    }

    // Handle other database errors
    return res.status(500).json({
      success: false,
      error: "Failed to create user",
      details: error.message,
    });
  }
}

/**
 * Log in an existing user
 * @route POST /auth/login
 */
async function loginUser(req, res) {
  try {
    if (!req.body || !req.body.email || !req.body.password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        email: req.body.email,
      },
    });

    // In the case the user does not exist
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if password is valid
    const isPasswordValid = await comparePassword(
      req.body.password,
      user.password,
    );

    // In the case the password is invalid
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid password",
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );

    // Send token as an httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: Number(process.env.JWT_EXPIRES_IN_MS) || 24 * 60 * 60 * 1000,
    });

    // Remove password from response
    delete user.password;

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: user,
      token,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to log in user",
    });
  }
}

/**
 * Log out the current user
 * @route GET /auth/logout
 */
async function logoutUser(req, res) {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to log out user",
    });
  }
}


async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });


    // If user does not exist, return an error message
    if (!user) {
      return res.status(404).json({
        message: "User does not exist.",
        success: false,
      });
    }

    // Generate reset token
    const { rawToken, hashedToken } = generateResetToken();

    // Update user's record in the user table with reset token and expiry date
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Send reset email and sends token as a URL parameter
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await sendResetEmail(email, resetURL);

    res.status(200).json({ message: "If this email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ message: "An error occurred. Please try again later." });
  }
}

async function resetPassword(req, res){
    try {
        // Extract token and new password from request body
        const { token, password } = req.body;

        // Verify token
        const user = await prisma.user.findUnique({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gte: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        // Hash new password
        const hashedPassword = await hashPassword(password);

        // Update user with new password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        res.status(200).json({ message: "Password reset successful. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "An error occurred. Please try again later." });
    }
}

export { signupUser, loginUser, logoutUser, forgotPassword , resetPassword};
