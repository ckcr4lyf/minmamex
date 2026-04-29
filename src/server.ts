import express from "express";
import cors from "cors";
import { randomBytes, randomUUID } from "node:crypto";

import { getAccountsList, getAllLoyaltyTransactionsForAccounts } from "./api.js";
import { loginAmexHongKong } from "./auth.js";
import { getLogger } from "./logger.js";
import { Job, JobStatus } from "./db.js";
import { getQuarterlySummary } from "./utils.js";

const LOG = getLogger();

const app = express();
app.use(cors());
app.use(express.json());

const jobs = new Map<string, Job>();

type ScrapeRewardsBody = {
  username?: string;
  password?: string;
  debug?: boolean;
};

const runScrapeJob = async (jobId: string, username: string, password: string, debug?: boolean): Promise<void> => {
  const existingJob = jobs.get(jobId);
  if (!existingJob) {
    return;
  }

  LOG.info(`Job ${jobId}: Starting scrape job...`);

  jobs.set(jobId, {
    ...existingJob,
    status: JobStatus.AUTHENTICATING,
    error: undefined,
  });

  const debugDir = debug ? `./debug_raw/${jobId}` : undefined;

  try {
    LOG.debug(`Job ${jobId}: Logging in...`);
    const cookies = await loginAmexHongKong(username, password);
    LOG.debug(`Job ${jobId}: Login successful.`);

    jobs.set(jobId, {
      ...jobs.get(jobId)!,
      status: JobStatus.RETRIEVING_DATA,
    });

    LOG.debug(`Job ${jobId}: Fetching accounts...`);
    const cards = await getAccountsList(cookies, debugDir);
    LOG.debug(`Job ${jobId}: Found ${cards.length} accounts.`);

    const accountResults: NonNullable<Job["results"]> = [];
    for (const card of cards) {
      const transactions = await getAllLoyaltyTransactionsForAccounts(cookies, card.id, debugDir);
      accountResults.push({
        accountToken: card.id,
        cardName: card.name,
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
    LOG.info(`Job ${jobId}: Completed successfully with ${accountResults.length} account results.`);
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
    LOG.error(`Job ${jobId}: Failed - ${errorMessage}`);
  }
};

app.post("/scrape_rewards", (req, res) => {
  const { username, password, debug } = req.body as ScrapeRewardsBody;

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
    status: JobStatus.AUTHENTICATING,
    createdAt: new Date(),
  };

  jobs.set(id, job);
  LOG.info(`New scrape job created: ${id}`);
  res.json({ id, secret });

  void runScrapeJob(id, username, password, debug);
});

app.get("/scrape_results", (req, res) => {
  const id = req.query.id;
  const secret = req.query.secret;
  const includeTransactions = req.query.includeTransactions === "true";
  if (typeof id !== "string" || typeof secret !== "string") {
    res.status(400).json({ error: "id and secret are required" });
    return;
  }

  const job = jobs.get(id);
  if (!job || job.secret !== secret) {
    res.status(404).json({ error: "job not found" });
    return;
  }

  if (job.status === JobStatus.AUTHENTICATING || job.status === JobStatus.RETRIEVING_DATA || job.status === JobStatus.FAILED) {
    res.json({
      id: job.id,
      status: job.status,
      error: job.error,
    });
    return;
  }

  const results = job.results?.map(r => includeTransactions
    ? r
    : { accountToken: r.accountToken, cardName: r.cardName, quarterlySummary: r.quarterlySummary }
  );

  res.json({
    id: job.id,
    status: job.status,
    results,
  });
});

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
app.listen(port, (err) => {
  if (err) {
    LOG.error(`Failed to bind to port ${port}: ${err}`);
    process.exit(1);
  }
  LOG.info(`Server listening on port ${port}`);
});