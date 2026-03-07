import { getQuizCategories } from "../controllers/quiz.js";
import { Router } from "express";

const quizRouter = Router();

quizRouter.get("/categories", getQuizCategories);

export default quizRouter;
