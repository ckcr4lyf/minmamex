import { getAccountsList, getAllLoyaltyTransactionsForAccounts } from "./api.js";
import { getQuarterlySummary } from "./utils.js";

const cookies = process.argv[2];
if (!cookies) {
  console.error('Usage: node bin.js "<cookie string>"');
  process.exit(1);
}

try {
  const accounts = await getAccountsList(cookies);
  for (const accountToken of accounts) {
    const transactions = await getAllLoyaltyTransactionsForAccounts(cookies, accountToken);
    const quarterlySummary = getQuarterlySummary(transactions);
    console.log(`Account: ${accountToken}`);
    console.log(JSON.stringify(quarterlySummary, null, 2));
    console.log("");
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
