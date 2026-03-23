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

type MaxBonus = {
  maxBonus: number; // max bonus points that can be earned in this category
  rate: number; // points per $1 spent for this category
}

const KNOWN_MAX_BONUS: Record<string, MaxBonus> = {
  "2026 Explorer 7X": {
    maxBonus: 70000,
    rate: 7,
  },
  "Explorer 7X Airline 2026": {
    maxBonus: 70000,
    rate: 7,
  },
  "Explorer 7X Airlines max 70000 points per quarter": {
    maxBonus: 70000,
    rate: 7,
  },
  "Explorer 7x foreign spend bonus upto max 70000 points": {
    maxBonus: 70000,
    rate: 7,
  },
  "Additional HK$1=7 point in the first\r\nHK$10K FX per quarter": {
    maxBonus: 70000,
    rate: 7,
  },
  "Platinum Accelerator 2025 Travel": {
    maxBonus: 75000,
    rate: 5,
  },
  "Platinum Accelerator 2025 Foreign Currency": {
    maxBonus: 105000,
    rate: 7,
  },
  "Platinum Accelerator 2025 Everyday Spend": {
    maxBonus: 105000,
    rate: 7,
  },
};

const buildBonusInfo = (description: string, pointsEarned: number): BonusInfo => {
  const maxBonusInfo = KNOWN_MAX_BONUS[description];
  if (!maxBonusInfo) {
    return { pointsEarned };
  }

  const pointsRemaining = Math.max(maxBonusInfo.maxBonus - pointsEarned, 0);
  return {
    pointsEarned,
    pointsRemaining,
    spendRemaining: pointsRemaining / maxBonusInfo.rate,
  };
};

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
      summary.bonusPoints[desc] = buildBonusInfo(desc, prev + points);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.quarter.localeCompare(a.quarter));
};
