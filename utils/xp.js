// ─────────────────────────────────────────────────────────────────────────────
// XP SYSTEM — Single source of truth for Quizlo's 30-level progression system
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cumulative XP required to REACH each level (index 0 = Level 1).
 * Uses a ~1.4x exponential curve across 30 levels.
 */
export const LEVEL_THRESHOLDS = [
  0,       // Level 1  — Novice
  100,     // Level 2  — Initiate
  250,     // Level 3  — Apprentice
  450,     // Level 4  — Student
  700,     // Level 5  — Scholar
  1_050,   // Level 6  — Thinker
  1_500,   // Level 7  — Analyst
  2_050,   // Level 8  — Researcher
  2_700,   // Level 9  — Debater
  3_500,   // Level 10 — Expert
  4_500,   // Level 11 — Veteran
  5_750,   // Level 12 — Specialist
  7_250,   // Level 13 — Intellectual
  9_000,   // Level 14 — Prodigy
  11_000,  // Level 15 — Sage
  13_500,  // Level 16 — Master
  16_500,  // Level 17 — Champion
  20_000,  // Level 18 — Virtuoso
  24_000,  // Level 19 — Luminary
  29_000,  // Level 20 — Grandmaster
  35_000,  // Level 21 — Titan
  42_500,  // Level 22 — Prodigy Elite
  51_500,  // Level 23 — Oracle
  62_000,  // Level 24 — Visionary
  74_500,  // Level 25 — Legend
  89_000,  // Level 26 — Mythic
  106_000, // Level 27 — Transcendent
  126_000, // Level 28 — Ascendant
  150_000, // Level 29 — Eternal
  178_000, // Level 30 — Omniscient
];

export const MAX_LEVEL = 30;

export const LEVEL_LABELS = [
  "Novice", "Initiate", "Apprentice", "Student", "Scholar",
  "Thinker", "Analyst", "Researcher", "Debater", "Expert",
  "Veteran", "Specialist", "Intellectual", "Prodigy", "Sage",
  "Master", "Champion", "Virtuoso", "Luminary", "Grandmaster",
  "Titan", "Prodigy Elite", "Oracle", "Visionary", "Legend",
  "Mythic", "Transcendent", "Ascendant", "Eternal", "Omniscient",
];

export const TIERS = [
  "Beginner", "Beginner", "Beginner", "Beginner", "Beginner",
  "Bronze",   "Bronze",   "Bronze",   "Bronze",   "Bronze",
  "Silver",   "Silver",   "Silver",   "Silver",   "Silver",
  "Gold",     "Gold",     "Gold",     "Gold",     "Gold",
  "Platinum", "Platinum", "Platinum", "Platinum", "Platinum",
  "Diamond",  "Diamond",  "Diamond",  "Diamond",  "Diamond",
];

// ─────────────────────────────────────────────────────────────────────────────
// XP Reward constants — change values here to tune the economy
// ─────────────────────────────────────────────────────────────────────────────
export const XP_REWARDS = {
  COMPLETE_QUIZ:      20,  // flat reward for finishing any quiz
  CORRECT_ANSWER:      5,  // per correct answer
  PERFECT_SCORE_BONUS: 30, // all answers correct
  FIRST_TIME_PLAY:    10,  // first time a user completes a specific quiz
  CREATE_QUIZ:        50,  // publishing a new quiz (not a draft)
  DAILY_LOGIN:        15,  // once per calendar day
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the correct level (1–30) for a given cumulative XP total.
 * @param {number} totalXP
 * @returns {number}
 */
export function getLevelFromXP(totalXP) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

/**
 * Returns rich XP progress data for the frontend (profile card, dashboard, etc.)
 * @param {number} totalXP
 * @returns {{
 *   currentLevel: number,
 *   label: string,
 *   tier: string,
 *   xpIntoLevel: number,
 *   xpToNextLevel: number | null,
 *   progressPercentage: number
 * }}
 */
export function getXPProgress(totalXP) {
  const currentLevel = getLevelFromXP(totalXP);

  // Max level — no "next level" exists
  if (currentLevel >= MAX_LEVEL) {
    return {
      currentLevel: MAX_LEVEL,
      label: LEVEL_LABELS[MAX_LEVEL - 1],
      tier: TIERS[MAX_LEVEL - 1],
      xpIntoLevel: totalXP - LEVEL_THRESHOLDS[MAX_LEVEL - 1],
      xpToNextLevel: null,
      progressPercentage: 100,
    };
  }

  const currentLevelXP  = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextLevelXP     = LEVEL_THRESHOLDS[currentLevel];
  const xpIntoLevel     = totalXP - currentLevelXP;
  const xpRangeForLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.floor((xpIntoLevel / xpRangeForLevel) * 100);

  return {
    currentLevel,
    label: LEVEL_LABELS[currentLevel - 1],
    tier: TIERS[currentLevel - 1],
    xpIntoLevel,
    xpToNextLevel: nextLevelXP - totalXP,
    progressPercentage,
  };
}
