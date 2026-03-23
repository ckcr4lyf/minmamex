import { LoyaltyTransaction } from "./api.js";

export type QuarterlySummary = {
  quarter: string; // YYYY-QX
  totalPoints: number;
  basePoints: number;
  bonusPoints: Record<string, number>; // key is the description, value is the points
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
      summary.bonusPoints[tx.descriptions] = (summary.bonusPoints[tx.descriptions] ?? 0) + points;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.quarter.localeCompare(b.quarter));
};
