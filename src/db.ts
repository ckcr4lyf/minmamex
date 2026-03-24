import { LoyaltyTransaction } from "./api.js";
import { QuarterlySummary } from "./utils.js";

export enum JobStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export type Job = {
  id: string;
  secret: string;
  status: JobStatus;
  createdAt: Date;
  error?: string;
  results?: {
    accountToken: string;
    transactions: LoyaltyTransaction[];
    quarterlySummary: QuarterlySummary[];
  }[];
};