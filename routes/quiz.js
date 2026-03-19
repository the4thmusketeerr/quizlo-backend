import { getQuizCategories,getAllQuizzes,createQuiz,startQuiz, completeQuiz, getQuizbyId,submitAnswer } from "../controllers/quiz.js";
import { Router } from "express";
import { verifyToken } from "../middleware/token.js";

const quizRouter = Router();

quizRouter.get("/all", verifyToken, getAllQuizzes);
quizRouter.get("/categories", verifyToken, getQuizCategories);
quizRouter.post("/create", verifyToken,createQuiz);
quizRouter.get("/:id", verifyToken, getQuizbyId); // where :id is the quizId
quizRouter.post("/:id/start", verifyToken, startQuiz); // where :id is the quizId
quizRouter.post("/attempts/:attemptId/submit-answer", verifyToken, submitAnswer); // where :attemptId is the attemptId
quizRouter.post("/attempts/:attemptId/complete", verifyToken, completeQuiz); // where :attemptId is the attemptId


export default quizRouter;
