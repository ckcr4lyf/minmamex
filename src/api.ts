export const getAccountsList = async (cookies: string): Promise<string[]> => {
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
  const regex = new RegExp(/\\\"productsOrder\\\",(\[[^\]]+\])/);
  const match = html.match(regex);

  if (!match) {
    throw new Error("Failed to extract accounts list from HTML");
  }

  const accounts = JSON.parse(match[1].replaceAll(`\\`, ""));
  return accounts;
}

type LoyaltyTransactionParams = {
  accountToken: string;
  offset: number;
  limit: number;
  periodIndex: number;
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
  transactions: {
    type: 'BASE' | 'BONUS',
    postedDate: string; // YYYY-MM-DD
    rewardAmount: {
      value: number;
      currencyType: 'POINTS';
    },
    descriptions: string; // yes they use "plural" in their API schema...
  }[];
}

const getLoyaltyTransactions = async (cookies: string, params: LoyaltyTransactionParams): Promise<LoyaltyTransactionResponse> => {
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
      // Below are hardcoded, not sure if they need to change
      periodType: "CALENDAR_PERIOD",
      transactionsFor: "LOYALTY_ACCOUNT",
      productType: "AEXP_CARD_ACCOUNT",
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch loyalty transactions: ${response.status}`);
  }

  return response.json();
}