import { ReviewCard } from "@/types/domain";

type Grade = "again" | "hard" | "good";

type NextReview = {
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  totalSuccess: number;
  totalFail: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function nextReview(card: ReviewCard, grade: Grade): NextReview {
  const now = new Date();
  const prevEase = card.ease ?? 2.5;
  const prevInterval = card.interval_days ?? 0;
  const prevReps = card.repetitions ?? 0;
  const prevSuccess = card.total_success ?? 0;
  const prevFail = card.total_fail ?? 0;

  let ease = prevEase;
  let repetitions = prevReps;
  let interval = prevInterval;
  let totalSuccess = prevSuccess;
  let totalFail = prevFail;

  if (grade === "again") {
    ease = clamp(prevEase - 0.2, 1.3, 3.0);
    repetitions = 0;
    interval = 1;
    totalFail += 1;
  } else {
    ease = grade === "good" ? prevEase + 0.05 : prevEase - 0.05;
    ease = clamp(ease, 1.3, 3.2);
    repetitions = prevReps + 1;
    interval =
      repetitions === 1
        ? 1
        : repetitions === 2
          ? 3
          : Math.round(prevInterval * ease);
    totalSuccess += 1;
  }

  const due = new Date(now);
  due.setDate(now.getDate() + interval);

  return {
    ease,
    intervalDays: interval,
    repetitions,
    dueAt: due.toISOString(),
    totalSuccess,
    totalFail,
  };
}

export type { Grade, NextReview };
