import { prisma } from "../lib/prisma.js";
import { generateId } from "../utils/id.js";
import { getLevelFromXP, XP_REWARDS } from "../utils/xp.js";

/**
 * Converts frontend question data into the answerOption rows to be stored.
 *
 * Text-based types (ShortAnswer, LongAnswer, FillInTheBlank) store their
 * answer in `q.correctAnswerText`, not inside `q.options`.
 * Numeric stores its answer in `q.correctAnswerNumeric`.
 * All other types (Mcq, TrueFalse, MultipleSelect, Matching, OrderSequencing)
 * use the standard `q.options` array.
 */
function buildAnswerOptions(q) {
  const TEXT_TYPES = ["ShortAnswer", "LongAnswer", "FillInTheBlank"];

  // ── Free-text answer types ────────────────────────────────────────────────
  if (TEXT_TYPES.includes(q.type)) {
    const answer = (q.correctAnswerText ?? "").trim();
    if (!answer) return []; // nothing to store yet (e.g. draft)
    return [{ id: generateId("opt"), text: answer, isCorrect: true, matchText: null, order: 1 }];
  }

  // ── Numeric answer ───────────────────────────────────────────────────────
  if (q.type === "Numeric") {
    const answer = q.correctAnswerNumeric !== undefined && q.correctAnswerNumeric !== null && q.correctAnswerNumeric !== ""
      ? String(q.correctAnswerNumeric)
      : null;
    if (!answer) return [];
    return [{ id: generateId("opt"), text: answer, isCorrect: true, matchText: null, order: 1 }];
  }

  // ── All other types (options array) ──────────────────────────────────────
  return (q.options ?? []).map((opt, idx) => ({
    id: generateId("opt"),
    text: opt.text ?? "",
    isCorrect: ["Matching", "OrderSequencing"].includes(q.type) ? true : !!opt.isCorrect,
    matchText: opt.matchText ?? null,
    order: opt.order ?? idx + 1,
  }));
}

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
        id: generateId("quiz"),
        title: payload.title,
        description: payload.description,
        difficulty: payload.difficulty,
        timeAllocated: payload.timeAllocated,
        isPrivate: payload.isPrivate,
        isDraft: payload.isDraft,
        creationMode: payload.creationMode,
        plays: payload.plays || 0,
        coverPicture: payload.coverPicture,
        creatorId: creatorId,
        categoryId: payload.categoryId,
        questions: {
          create:
            payload.questions?.map((q, qIndex) => ({
              id: generateId("ques"),
              text: q.text,
              type: q.type || "Mcq",
              explanation: q.explanation,
              media: q.media || [],
              order: qIndex + 1,
              answerOptions: {
                create: buildAnswerOptions(q),
              },
            })) || [],
        },
      },
    });

    console.log("Backend: Quiz created successfully:", quiz.id);

    // Award XP to creator when publishing a real quiz (not a draft)
    if (!payload.isDraft) {
      const creator = await prisma.user.findUnique({ where: { id: creatorId } });
      if (creator) {
        const newTotalXP = creator.xp + XP_REWARDS.CREATE_QUIZ;
        const newLevel   = getLevelFromXP(newTotalXP);
        await prisma.user.update({
          where: { id: creatorId },
          data: { xp: newTotalXP, level: newLevel },
        });
      }
    }

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

async function updateQuiz(req, res) {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;
    const { questions, deletedQuestionIds, ...rawData } = req.body;

    // 1. Ownership & Existence Check (outside transaction — no writes needed)
    const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (!existingQuiz) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }

    if (existingQuiz.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this quiz.",
      });
    }

    // 2. Strip restricted fields from the top-level update payload
    ["id", "plays", "rating", "createdAt", "categoryId", "creatorId", "creationMode", "updatedAt"]
      .forEach((field) => delete rawData[field]);

    // 3. Interactive transaction with a 30s timeout
    //    (the { timeout } option is only honoured on the callback form, NOT the array form)
    await prisma.$transaction(async (tx) => {

      // A. Update top-level quiz fields
      await tx.quiz.update({ where: { id: quizId }, data: rawData });

      // B. Delete removed questions (cascade removes their answerOptions)
      if (Array.isArray(deletedQuestionIds) && deletedQuestionIds.length > 0) {
        await tx.question.deleteMany({
          where: { id: { in: deletedQuestionIds }, quizId },
        });
      }

      // C. Process each question
      if (Array.isArray(questions)) {
        for (const [qIndex, q] of questions.entries()) {

          if (q.id) {
            // ── Existing question ────────────────────────────────────────────
            await tx.question.update({
              where: { id: q.id },
              data: {
                text:        q.text,
                type:        q.type,
                explanation: q.explanation ?? null,
                media:       q.media ?? [],
                order:       qIndex + 1,
              },
            });

            // Wipe old options and bulk-insert new ones in 2 calls (not N+1)
            await tx.answerOption.deleteMany({ where: { questionId: q.id } });

            const builtOptions = buildAnswerOptions(q);
            if (builtOptions.length > 0) {
              await tx.answerOption.createMany({
                data: builtOptions.map((opt) => ({
                  questionId: q.id,
                  ...opt,
                })),
              });
            }

          } else {
            // ── New question — create with nested options in one call ─────────
            await tx.question.create({
              data: {
                id:          generateId("ques"),
                quizId,
                text:        q.text,
                type:        q.type ?? "Mcq",
                explanation: q.explanation ?? null,
                media:       q.media ?? [],
                order:       qIndex + 1,
                answerOptions: {
                  create: buildAnswerOptions(q),
                },
              },
            });
          }
        }
      }
    }, { timeout: 30_000 }); // 30 s — required for Neon remote DB

    // 4. Return updated quiz with questions
    const updatedQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { answerOptions: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Quiz updated successfully.",
      data: updatedQuiz,
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update quiz.",
      error: error.message,
    });
  }
}

async function deleteQuiz(req, res) {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;

    // 1. Ownership & Existence Check
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!existingQuiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    if (existingQuiz.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this quiz.",
      });
    }

    // 2. Perform deletion (Cascade will handle questions and options if configured)
    await prisma.quiz.delete({
      where: { id: quizId },
    });

    return res.status(200).json({
      success: true,
      message: "Quiz deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete quiz.",
      error: error.message,
    });
  }
}

async function getQuizQuestions(req, res){
  try{
    const quizId = req.params.id

    if(!quizId){
      return res.status(400).json({
        success: false,
        message: "Quiz ID is required.",
      });
    }

    // Find quiz and include questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
        },
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
      message: "Quiz questions fetched successfully.",
      data: quiz.questions,
    });
  }
  catch(error){
    console.error("Error getting quiz questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get quiz questions.",
      error: error.message,
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


    // if quiz status is draft or private, then don't return the quiz
    const filteredQuizzes = quizzes.filter((quiz) => quiz.status !== "draft" && quiz.isPrivate !== true );


    return res.status(200).json({
      success: true,
      data: filteredQuizzes,
      count: filteredQuizzes.length,
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
        id: generateId("attm"),
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
          id: generateId("ansr"),
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

    // 1. Fetch Attempt with all answers and the original Quiz difficulty — plus the quiz's correct answers
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                answerOptions: {
                  where: { isCorrect: true },
                },
              },
            },
          },
        },
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
    const totalQuestions = attempt.totalQuestions;
    // Build the "Master" list of correct answers for this quiz
    const correctAnswers = attempt.quiz.questions.map((q) => {
      let correctData = null;
      switch (q.type) {
        case "Mcq":
        case "TrueFalse":
          correctData = q.answerOptions[0]?.id;
          break;
        case "MultipleSelect":
          correctData = q.answerOptions.map((o) => o.id).sort();
          break;
        case "ShortAnswer":
        case "FillInTheBlank":
        case "Numeric":
          correctData = q.answerOptions[0]?.text;
          break;
        case "Matching":
          correctData = q.answerOptions.reduce((acc, opt) => {
            acc[opt.id] = opt.matchText;
            return acc;
          }, {});
          break;
        case "OrderSequencing":
          correctData = [...q.answerOptions]
            .sort((a, b) => a.order - b.order)
            .map((o) => o.id);
          break;
        default:
          correctData = null;
      }
      return { questionId: q.id, type: q.type, correctData };
    });

    // Score as a percentage: (correct / total) * 100
    const scorePercentage = Math.round((correctAnswersCount / totalQuestions) * 100);

    // 4. CALCULATE XP EARNED
    // a) Base reward for completing the quiz
    let xpEarned = XP_REWARDS.COMPLETE_QUIZ;

    // b) Per correct answer
    xpEarned += correctAnswersCount * XP_REWARDS.CORRECT_ANSWER;

    // c) Perfect score bonus
    if (correctAnswersCount === totalQuestions) {
      xpEarned += XP_REWARDS.PERFECT_SCORE_BONUS;
    }

    // d) First-time play bonus — check for any OTHER completed attempt on this quiz
    const previousAttemptCount = await prisma.quizAttempt.count({
      where: {
        userId,
        quizId: attempt.quizId,
        completedAt: { not: null },
        id: { not: attemptId }, // exclude the current attempt being finalized
      },
    });
    if (previousAttemptCount === 0) {
      xpEarned += XP_REWARDS.FIRST_TIME_PLAY;
    }

    // e) Apply difficulty multiplier
    const difficultyMultipliers = { Easy: 1, Medium: 1.5, Hard: 2 };
    const multiplier = difficultyMultipliers[attempt.quiz.difficulty] || 1;
    const totalXPEarned = Math.round(xpEarned * multiplier);

    // 5. GAMIFICATION UPDATES (User Profile)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const newTotalXP = user.xp + totalXPEarned;
    const newLevel   = getLevelFromXP(newTotalXP);
    const didLevelUp = newLevel > user.level;
    const updatedStreak = user.streak + 1;

    // 6. UPDATE EVERYTHING TRANSACTIONALLY
    await prisma.$transaction([
      // A. Mark Attempt as Complete
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          accuracy: scorePercentage,
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

    // 7. RESPONSE: The "Victory" Screen Data
    console.log("Quiz summary data sent:", {
      score: scorePercentage,
      questionsAnsweredCorrectly: correctAnswersCount,
      totalQuestions,
      xpEarned: totalXPEarned,
      levelUp: didLevelUp,
      correctAnswers,
      newLevel,
    });
    return res.status(200).json({
      success: true,
      message: "Quiz completed! Great job.",
      data: {
        score: scorePercentage,                       // e.g. 80 → "80%"
        questionsAnsweredCorrectly: correctAnswersCount, // e.g. 8
        totalQuestions,                               // e.g. 10 → display "8/10"
        xpEarned: totalXPEarned,
        levelUp: didLevelUp,                          // trigger confetti on frontend
        correctAnswers,
        newLevel,
      },
    });
  } catch (error) {
    console.error("Complete Quiz Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}







export { 
  getQuizCategories, 
  getAllQuizzes, 
  createQuiz, 
  startQuiz, 
  getQuizbyId, 
  submitAnswer, 
  completeQuiz, 
  updateQuiz, 
  deleteQuiz 
};
