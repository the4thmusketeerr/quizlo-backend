import express from "express";
import { prisma } from "./lib/prisma.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import morgan from "morgan";
import passport from "passport";
import session from "express-session";
import userRouter from "./routes/user.js";
import authRouter from "./routes/auth.js";
import quizRouter from "./routes/quiz.js";
import mediaRouter from "./routes/media.js";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://quizlo-backend-4lb3.onrender.com",
    ],
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
app.use("/auth", authRouter);

// User Routes
app.use("/user", userRouter);

// Quiz Routes
app.use("/quiz", quizRouter);

// Media Routes
app.use("/media", mediaRouter);

const port = 9000;

async function main() {
  await prisma.$connect();
  console.log("Connected to Neon database");

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

main().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});
