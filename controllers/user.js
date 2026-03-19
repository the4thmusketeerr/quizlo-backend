import { prisma } from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { cloudinary } from "../config/cloudinary.js";

import "dotenv/config";
import { z } from "zod";

/**
 * Retrieve the authenticated user's profile
 * @route GET /user/me
 */
async function getUser(req, res) {
  try {
    console.log("User ID from token:", req.user.id);
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


// Retrieve any user by their ID
// @route GET /user/:id
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: {
        id,
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
    const protectedFields = ["id", "password", "createdAt", "updatedAt"];

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

/**
 * Upload a profile picture for the authenticated user
 * @route POST /user/profile-picture
 */
async function uploadProfilePicture(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }
    // Upload buffer to Cloudinary using a stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "quizlo/profile-pictures",
          public_id: `user_${req.user.id}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file.buffer);
    });
    // Save the URL to the database
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: result.secure_url },
    });
    delete user.password;
    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to upload profile picture",
    });
  }
}

async function deleteProfilePicture(req, res) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: null },
    });
    delete user.password; // Remove password from response
    return res.status(200).json({
      success: true,
      message: "Profile picture deleted successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete profile picture",
    });
  }
}


async function getUserQuizzes(req, res) {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        creatorId: req.user.id,

      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
    return res.status(200).json({
      success: true,
      data: quizzes,
      count: quizzes.length,
    });
  } catch (error) {
    console.error("Error getting user quizzes:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get user quizzes",
    });
  }
}


async function getUserDashboard(req, res) {
  try {
    const userId = req.user.id;

    // 1. Fetch User Profile & Basic Stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        profilePicture: true,
        xp: true,
        level: true,
        streak: true,
      },
    });

    // 2. NEW: Fetch All Quizzes Created by the User
    const myQuizzes = await prisma.quiz.findMany({
      where: { creatorId: userId },
      include: {
        category: { select: { name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Aggregate Performance Stats
    const performance = await prisma.quizAttempt.aggregate({
      where: { userId: userId, completedAt: { not: null } },
      _count: { id: true },
      _avg: { accuracy: true },
      _sum: { xpEarned: true },
    });

    // 4. Fetch Recent Activity ie. last 5 quizzes played by the user
    const recentActivity = await prisma.quizAttempt.findMany({
      where: { userId: userId, completedAt: { not: null } },
      take: 5,
      orderBy: { completedAt: "desc" },
      include: { quiz: { select: { title: true } } },
    });

    return res.status(200).json({
      success: true,
      data: {
        profile: user,
        myQuizzes, // All quizzes created by the user
        statistics: {
          totalQuizzesPlayed: performance._count.id,
          totalQuizzesCreated: myQuizzes.length,
          averageAccuracy: performance._avg.accuracy || 0,
          totalXPEarned: performance._sum.xpEarned || 0,
        },
        recentActivity,
        goals: {
          xpToNextLevel: 1000 - (user.xp % 1000),
          progressPercentage: (user.xp % 1000) / 10,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error loading dashboard" });
  }
}


async function rateQuiz(req, res) {
  try {
    const RateQuizSchema = z.object({
      quizId: z.string().min(1, "Quiz ID is required"),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    });

    const validation = RateQuizSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { quizId, rating, comment } = validation.data;
    const userId = req.user.id;

    // 1. Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
      });
    }

    // 2. Record/update the rating.
    // If user has already rated the quiz, update the rating.
    // If user has not rated the quiz, create a new rating.
    // This enforces one rating per user per quiz.
    await prisma.quizRating.upsert({
      where: {
        quizId_userId: {
          quizId,
          userId,
        },
      },
      update: {
        rating,
        comment,
      },
      create: {
        quizId,
        userId,
        rating,
        comment,
      },
    });

    // 3. Calculate new average rating for the quiz
    const aggregations = await prisma.quizRating.aggregate({
      where: { quizId },
      _avg: {
        rating: true,
      },
    });

    const averageRating = Math.round(aggregations._avg.rating || 0);

    // 4. Update the Quiz model with the new rounded average
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        rating: averageRating,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Quiz rated successfully",
      data: {
        userRating: rating,
        quizAverageRating: averageRating,
        quiz: updatedQuiz,
      },
    });
  } catch (error) {
    console.error("Error in rateQuiz:", error);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred",
    });
  }
}




export {
  getUser,
  getUserById,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  getUserQuizzes,
  getUserDashboard,
  rateQuiz
};
