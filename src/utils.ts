import { LoyaltyTransaction } from "./api.js";

export type QuarterlySummary = {
  quarter: string; // YYYY-QX
  totalPoints: number;
  basePoints: number;
  bonusPoints: Record<string, BonusInfo>; // key is the description
}

type BonusInfo = {
  pointsEarned: number;
  pointsRemaining?: number;
  spendRemaining?: number;
}

const quarterFromDate = (postedDate: string): string => {
  const [year, month] = postedDate.split("-").map(Number);
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
};

export const getQuarterlySummary = (transactions: LoyaltyTransaction[]): QuarterlySummary[] => {
  const map = new Map<string, QuarterlySummary>();

  for (const tx of transactions) {
    const quarter = quarterFromDate(tx.postedDate);
    if (!map.has(quarter)) {
      map.set(quarter, { quarter, totalPoints: 0, basePoints: 0, bonusPoints: {} });
    }
    const summary = map.get(quarter)!;
    const points = tx.rewardAmount.value;

    summary.totalPoints += points;
    if (tx.type === "BASE") {
      summary.basePoints += points;
    } else {
      const desc = tx.descriptions;
      const prev = summary.bonusPoints[desc]?.pointsEarned ?? 0;
      summary.bonusPoints[desc] = { pointsEarned: prev + points };
    }
  }

  return Array.from(map.values()).sort((a, b) => b.quarter.localeCompare(a.quarter));
};
