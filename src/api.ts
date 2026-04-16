import { getLogger } from "./logger.js";
import { saveDebugFile } from "./debug.js";
import { extractCardsFromHtml } from "./extract.js";

const LOG = getLogger();

/**
 * For auth, the cookies needed are `amexsessioncookie` & `aat`. Everything else can be omitted
 */
export const getAccountsList = async (cookies: string, debugDir?: string): Promise<string[]> => {
  LOG.debug("Fetching accounts list...");
  const response = await fetch("https://global.americanexpress.com/rewards/summary", {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,zh-TW;q=0.7,zh;q=0.6",
      "cookie": cookies,
      "Referer": "https://www.americanexpress.com/"
    },
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts list: ${response.status}`);
  }

  const html = await response.text();

  if (debugDir) {
    await saveDebugFile(debugDir, "accounts_html", html, "html");
  }

  const cards = extractCardsFromHtml(html);

  if (cards.length === 0) {
    throw new Error("Failed to extract accounts list from HTML");
  }

  const accounts = cards.map(card => card.id);
  LOG.debug(`Found ${accounts.length} accounts.`);
  return accounts;
}

type LoyaltyTransactionParams = {
  accountToken: string;
  offset: number;
  limit: number;
  periodIndex: number;
}

export type LoyaltyTransaction = {
  type: 'BASE' | 'BONUS',
  postedDate: string; // YYYY-MM-DD
  rewardAmount: {
    value: number;
    currencyType: 'POINTS';
  },
  descriptions: string; // yes they use "plural" in their API schema...
}

type LoyaltyTransactionResponse = {
  metadata: {
    limit: number;
    totalRecords: number;
    nextIndex: number;
    offset: number;
  },
  status: {
    code: string,
    description: string,
  },
  periods: {
    periodIndex: number;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  }[],
  transactions: LoyaltyTransaction[];
}

const getLoyaltyTransactions = async (
  cookies: string,
  params: LoyaltyTransactionParams,
  debugDir?: string
): Promise<LoyaltyTransactionResponse> => {
  const response = await fetch("https://functions.americanexpress.com/ReadLoyaltyTransactions.v1", {
    headers: {
      "accept": "application/json",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,zh-TW;q=0.7,zh;q=0.6",
      "content-type": "application/json",
      "cookie": cookies
    },
    method: "POST",
    body: JSON.stringify({
      ...params,
      periodType: "CALENDAR_PERIOD",
      transactionsFor: "LOYALTY_ACCOUNT",
      productType: "AEXP_CARD_ACCOUNT",
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch loyalty transactions: ${response.status}`);
  }

  const data = await response.json();

  if (debugDir) {
    const filename = `transactions_p${params.periodIndex}_o${params.offset}`;
    await saveDebugFile(debugDir, filename, data);
  }

  return data;
}

export const getAllLoyaltyTransactionsForAccounts = async (
  cookies: string,
  accountToken: string,
  debugDir?: string
): Promise<LoyaltyTransaction[]> => {
  LOG.debug(`Fetching transactions for account: ${accountToken}...`);
  const limit = 500;
  let maxPeriodIndex = 0;
  const allTransactions: LoyaltyTransaction[] = [];
  const accountDebugDir = debugDir ? `${debugDir}/${accountToken}` : undefined;

  for (let periodIndex = 0; periodIndex <= maxPeriodIndex; periodIndex++) {
    let offset = 0;

    for (;;) {
      const res = await getLoyaltyTransactions(cookies, {
        accountToken,
        offset,
        limit,
        periodIndex,
      }, accountDebugDir);

      if (periodIndex === 0 && res.periods.length > 0) {
        maxPeriodIndex = Math.max(...res.periods.map((p) => p.periodIndex));
      }

      allTransactions.push(...res.transactions);
      LOG.debug(`Period ${periodIndex}: fetched ${res.transactions.length} transactions (total: ${allTransactions.length})`);

      const { metadata } = res;
      if (res.transactions.length === 0) {
        break;
      }
      if (offset + res.transactions.length >= metadata.totalRecords) {
        break;
      }
      offset += limit;
    }
  }

  LOG.debug(`Completed fetching ${allTransactions.length} transactions for account: ${accountToken}`);
  return allTransactions;
};
