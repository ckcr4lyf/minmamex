import express from "express";
import { randomBytes, randomUUID } from "node:crypto";

import { getAccountsList, getAllLoyaltyTransactionsForAccounts } from "./api.js";
import { loginAmexHongKong } from "./auth.js";
import { Job, JobStatus } from "./db.js";
import { getQuarterlySummary } from "./utils.js";

const app = express();
app.use(express.json());

const jobs = new Map<string, Job>();

type ScrapeRewardsBody = {
  username?: string;
  password?: string;
};

const runScrapeJob = async (jobId: string, username: string, password: string): Promise<void> => {
  const existingJob = jobs.get(jobId);
  if (!existingJob) {
    return;
  }

  jobs.set(jobId, {
    ...existingJob,
    status: JobStatus.RUNNING,
    error: undefined,
  });

  try {
    const cookies = await loginAmexHongKong(username, password);
    const accounts = await getAccountsList(cookies);

    const accountResults: NonNullable<Job["results"]> = [];
    for (const accountToken of accounts) {
      const transactions = await getAllLoyaltyTransactionsForAccounts(cookies, accountToken);
      accountResults.push({
        accountToken,
        transactions,
        quarterlySummary: getQuarterlySummary(transactions),
      });
    }

    const refreshedJob = jobs.get(jobId);
    if (!refreshedJob) {
      return;
    }

    jobs.set(jobId, {
      ...refreshedJob,
      status: JobStatus.COMPLETED,
      results: accountResults,
    });
  } catch (error) {
    const refreshedJob = jobs.get(jobId);
    if (!refreshedJob) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown job failure";
    jobs.set(jobId, {
      ...refreshedJob,
      status: JobStatus.FAILED,
      error: errorMessage,
    });
  }
};

app.post("/scrape_rewards", (req, res) => {
  const { username, password } = req.body as ScrapeRewardsBody;

  if (typeof username !== "string" || username.length === 0) {
    res.status(400).json({ error: "username is required" });
    return;
  }
  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "password is required" });
    return;
  }

  const id = randomUUID();
  const secret = randomBytes(32).toString("hex");
  const job: Job = {
    id,
    secret,
    status: JobStatus.PENDING,
    createdAt: new Date(),
  };

  jobs.set(id, job);
  res.json({ id, secret });

  void runScrapeJob(id, username, password);
});

app.get("/scrape_results", (req, res) => {
  const id = req.query.id;
  const secret = req.query.secret;
  if (typeof id !== "string" || typeof secret !== "string") {
    res.status(400).json({ error: "id and secret are required" });
    return;
  }

  const job = jobs.get(id);
  if (!job || job.secret !== secret) {
    res.status(404).json({ error: "job not found" });
    return;
  }

  if (job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING || job.status === JobStatus.FAILED) {
    res.json({
      id: job.id,
      status: job.status,
      error: job.error,
    });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    results: job.results,
  });
});

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});