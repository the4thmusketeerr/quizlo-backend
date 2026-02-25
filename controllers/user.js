import { prisma } from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import "dotenv/config";

/**
 * Get the authenticated user's profile
 * @route GET /user/profile
 */
async function getUser(req, res) {
  try {
    console.log(req.user);
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    delete user.password;

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
}

/**
 * Update the authenticated user's profile
 * @route PATCH /user/profile
 */
async function updateProfile(req, res) {
  try {
    console.log("Update request from user:", req.user.id);
    console.log("Update data:", req.body);

    // Define fields that cannot be updated (password has separate endpoint)
    const protectedFields = ["id", "password", "created_at", "updated_at"];

    // Create a sanitized update object
    const updateData = { ...req.body };

    // Remove protected fields
    protectedFields.forEach((field) => delete updateData[field]);

    // Validate that there's actually data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields to update",
      });
    }

    // Update the user
    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: updateData,
    });

    // Remove password from response
    delete user.password;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    console.error("Error details:", error.message);
    console.error("Error code:", error.code);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Email or username already in use",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to update user",
      details: error.message,
    });
  }
}

/**
 * Change the authenticated user's password
 * @route PATCH /user/password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Please provide current and new password",
      });
    }

    if (currentPassword == newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password cannot be the same",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid current password",
      });
    }

    const hashednewPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        password: hashednewPassword,
      },
    });

    delete updatedUser.password;

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to change password",
    });
  }
}

async function uploadProfilePicture(req, res) {}

export { getUser, updateProfile, changePassword, uploadProfilePicture };
