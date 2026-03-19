import { prisma } from "../lib/prisma.js";
import { generateId } from "../utils/id.js";

async function createQuiz(req, res) {
  try {
    const payload = req.body;

    const creatorId = payload.creatorId || req.user?.id;

    console.log("Backend: Received createQuiz request");
    console.log("Backend: Derived creatorId:", creatorId);
    
    // Basic validation for required fields
    if (!payload.title || !creatorId || !payload.categoryId) {
      console.log("Backend: Validation failed:", { title: !!payload.title, creatorId: !!creatorId, categoryId: !!payload.categoryId });
      return res.status(400).json({
        success: false,
        error: "Missing required fields (title, creatorId, categoryId)",
      });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: payload.title,
        description: payload.description,
        difficulty: payload.difficulty,
        timeAllocated: payload.timeAllocated,
        isPrivate: payload.isPrivate,
        isDraft: payload.isDraft,
        creationMode: payload.creationMode,
        plays: payload.plays || 0,
        creatorId: creatorId,
        categoryId: payload.categoryId,
        questions: {
          create:
            payload.questions?.map((q, qIndex) => ({
              text: q.text,
              type: q.type || "Mcq",
              explanation: q.explanation,
              media: q.media || [],
              order: qIndex + 1,
              answerOptions: {
                create:
                  q.options?.map((opt, optIndex) => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    matchText: opt.matchText,
                    order: optIndex + 1,
                  })) || [],
              },
            })) || [],
        },
      },
    });

    console.log("Backend: Quiz created successfully:", quiz.id);

    return res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    console.error("Backend Error in createQuiz:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create quiz",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}


async function getQuizbyId(req, res) {
  try {
    const quiz_id = req.params.id;

    if (!quiz_id) {
      return res.status(400).json({
        success: false,
        message: "Quiz ID is required.",
      });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quiz_id },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
        },
        creator: {
          select: {
            username: true,
            profilePicture: true,
          },
        },
        _count: {
          select: {
            questions: true,
            ratings: true, //
          },
        },
        category: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quiz has been found.",
      data: quiz,
    });
  } catch (error) {
    console.error("Error getting quiz by ID:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while getting the quiz by ID",
      error: error.message,
    });
  }
}


async function getAllQuizzes(req, res) {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        creator: {
          select: {
            username: true,
            profilePicture: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            questions: true,
            ratings: true,
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
    console.error("Error getting quizzes:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get quizzes",
    });
  }
}

async function getQuizCategories(req, res) {
  try {
    const categories = await prisma.category.findMany();
    return res.status(200).json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error getting quiz categories:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get quiz categories",
    });
  }
}

async function startQuiz(req, res) {
  try {
    const quizId = req.params.id;
    const userId = req.user.id; // Provided by your auth middleware

    // 1. Fetch the quiz and its questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answerOptions: true, // We fetch everything initially
          },
        },
      },
    });

    if (!quiz) {
      return res
        .status(404)
        .json({ success: false, message: "Quiz not found" });
    }

    // 2. Create the QuizAttempt record (The "Life Cycle" starts here)
    // This generates the 'attemptId' that the frontend will use for every subsequent answer
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: userId,
        quizId: quizId,
        totalQuestions: quiz.questions.length,
        accuracy: 0, // Default starting values
        score: 0,
      },
    });

    // 3. SECURITY FILTER: Scrub the "isCorrect" field
    // We Map through questions and options to remove the answers before sending to client
    const sanitizedQuestions = quiz.questions.map((question) => ({
      ...question,
      answerOptions: question.answerOptions.map((option) => {
        // We extract isCorrect but don't include it in the returned 'publicOption'
        const { isCorrect, ...publicOption } = option;
        return publicOption;
      }),
    }));

    // 4. Return the Attempt ID and the safe data
    return res.status(200).json({
      success: true,
      message: "Quiz session started successfully",
      data: {
        attemptId: attempt.id, // Frontend saves this!
        quizTitle: quiz.title,
        timeAllocated: quiz.timeAllocated,
        questions: sanitizedQuestions, // Now safe from "Inspect Element" cheaters
      },
    });
  } catch (error) {
    console.error("Start Quiz Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function submitAnswer(req, res) {
  try {
    const { attemptId } = req.params;
    const { 
      questionId, 
      selectedOptionId, 
      selectedOptionIds, 
      textResponse, 
      responseJson, 
      timeSpent 
    } = req.body;
    const userId = req.user.id;

    // 1. Verify Attempt Ownership and Status
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });

    if (!attempt || attempt.userId !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized attempt access" });
    }

    if (attempt.completedAt) {
      return res.status(400).json({ success: false, message: "This attempt has already been completed" });
    }

    // 2. Check if this question has already been answered
    const existingAnswer = await prisma.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });

    if (existingAnswer) {
      return res.status(400).json({ success: false, message: "Question already answered" });
    }

    // 3. Fetch Question and its AnswerOptions
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { answerOptions: true },
    });

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // 4. Verify the Answer based on Question Type
    let isCorrect = false;
    let correctData = null;

    switch (question.type) {
      case "Mcq":
      case "TrueFalse": {
        const correctOption = question.answerOptions.find(o => o.isCorrect);
        isCorrect = correctOption?.id === selectedOptionId;
        correctData = correctOption?.id;
        break;
      }

      case "MultipleSelect": {
        const correctOptionIds = question.answerOptions
          .filter(o => o.isCorrect)
          .map(o => o.id)
          .sort();
        
        const userOptionIds = (selectedOptionIds || []).sort();
        
        isCorrect = JSON.stringify(correctOptionIds) === JSON.stringify(userOptionIds);
        correctData = correctOptionIds;
        break;
      }

      case "ShortAnswer":
      case "FillInTheBlank":
      case "Numeric": {
        const correctOption = question.answerOptions.find(o => o.isCorrect);
        const userResponse = (textResponse || "").trim().toLowerCase();
        const dbResponse = (correctOption?.text || "").trim().toLowerCase();
        
        isCorrect = userResponse === dbResponse;
        correctData = correctOption?.text;
        break;
      }

      case "Matching": {
        // Expected responseJson: { [optionId]: "matchTextValue" }
        isCorrect = question.answerOptions.every(option => {
          const userMatch = (responseJson || {})[option.id];
          return userMatch === option.matchText;
        });
        correctData = question.answerOptions.reduce((acc, opt) => {
          acc[opt.id] = opt.matchText;
          return acc;
        }, {});
        break;
      }

      case "OrderSequencing": {
        // Expected selectedOptionIds: [id1, id2, id3] in order
        const correctOrderIds = [...question.answerOptions]
          .sort((a, b) => a.order - b.order)
          .map(o => o.id);
        
        isCorrect = JSON.stringify(correctOrderIds) === JSON.stringify(selectedOptionIds);
        correctData = correctOrderIds;
        break;
      }

      case "LongAnswer": {
        // Often manual, but mark as completed/correct for now if not empty
        isCorrect = !!(textResponse && textResponse.trim().length > 10);
        break;
      }

      default:
        return res.status(400).json({ success: false, message: "Unknown question type" });
    }

    // 5. Calculate Points & Speed Bonus
    let pointsEarned = 0;
    if (isCorrect) {
      const basePoints = 100;
      const speedBonus = timeSpent < 5 ? 50 : 0;
      pointsEarned = basePoints + speedBonus;
    }

    // 6. Update Database (Transactionally)
    await prisma.$transaction([
      prisma.attemptAnswer.create({
        data: {
          attemptId,
          questionId,
          selectedOptionId: (question.type === "Mcq" || question.type === "TrueFalse") ? selectedOptionId : null,
          selectedOptionIds: (question.type === "MultipleSelect" || question.type === "OrderSequencing") ? selectedOptionIds : [],
          textResponse: (question.type === "ShortAnswer" || question.type === "FillInTheBlank" || question.type === "Numeric" || question.type === "LongAnswer") ? textResponse : null,
          responseJson: (question.type === "Matching") ? responseJson : undefined,
          isCorrect,
        },
      }),
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: { increment: pointsEarned },
        },
      }),
    ]);

    // 7. Return Feedback
    return res.status(200).json({
      success: true,
      data: {
        isCorrect,
        pointsEarned,
        correctData: isCorrect ? null : correctData, // Show correct answer if they missed it
      },
    });
  } catch (error) {
    console.error("Submit Answer Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function completeQuiz(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // 1. Fetch Attempt with all answers and the original Quiz difficulty
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        answers: true, // Specifically includes AttemptAnswer records
      },
    });

    if (!attempt || attempt.userId !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (attempt.completedAt) {
      return res
        .status(400)
        .json({ success: false, message: "Quiz already finalized" });
    }

    // 2. INTEGRITY CHECK: Did they answer all questions?
    // This prevents users from skipping the hard questions and just hitting "Complete"
    if (attempt.answers.length < attempt.totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Incomplete quiz. Answered ${attempt.answers.length}/${attempt.totalQuestions}`,
      });
    }

    // 3. CALCULATE FINAL STATS
    const correctAnswersCount = attempt.answers.filter(
      (a) => a.isCorrect,
    ).length;
    const accuracy = (correctAnswersCount / attempt.totalQuestions) * 100;

    // Logic for XP: (Score from Phase 2) * (Difficulty Multiplier)
    const difficultyMultipliers = { Easy: 1, Medium: 1.5, Hard: 2 };
    const multiplier = difficultyMultipliers[attempt.quiz.difficulty] || 1;
    const totalXPEarned = Math.round(attempt.score * multiplier);

    // 4. GAMIFICATION UPDATES (User Profile)
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Level Up Logic: Every 1000 XP is a new level (Example)
    const newTotalXP = user.xp + totalXPEarned;
    const newLevel = Math.floor(newTotalXP / 1000) + 1;

    // Streak Logic: Check if they played in the last 24-48 hours
    // (Actual streak logic usually compares 'yesterday' to 'today')
    let streakIncrement = 0;
    // Simplified: Give a streak boost if they completed the quiz
    const updatedStreak = user.streak + 1;

    // 5. UPDATE EVERYTHING TRANSACTIONALLY
    await prisma.$transaction([
      // A. Mark Attempt as Complete
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          accuracy,
          xpEarned: totalXPEarned,
          completedAt: new Date(),
        },
      }),
      // B. Update User Progress
      prisma.user.update({
        where: { id: userId },
        data: {
          xp: newTotalXP,
          level: newLevel,
          streak: updatedStreak,
        },
      }),
      // C. Increment Quiz Play Count (Analytics)
      prisma.quiz.update({
        where: { id: attempt.quizId },
        data: { plays: { increment: 1 } },
      }),
    ]);

    // 6. RESPONSE: The "Victory" Screen Data
    console.log("Quiz summary data sent:", {
      score: attempt.score,
      accuracy,
      xpEarned: totalXPEarned,
      levelUp: newLevel > user.level,
      newLevel,
    });
    return res.status(200).json({
      success: true,
      message: "Quiz completed! Great job.",
      data: {
        score: attempt.score,
        accuracy,
        xpEarned: totalXPEarned, // Integer value representing XP earned
        levelUp: newLevel > user.level, // Boolean to trigger a confetti animation
        newLevel,
      },
    });
  } catch (error) {
    console.error("Complete Quiz Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}







export { getQuizCategories, getAllQuizzes, createQuiz,startQuiz, getQuizbyId,submitAnswer,completeQuiz };
