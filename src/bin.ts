import { getAccountsList, getAllLoyaltyTransactionsForAccounts } from "./api.js";
import { loginAmexHongKong } from "./auth.js";
import { getQuarterlySummary } from "./utils.js";

function printUsage(): void {
  console.error(
    "Usage:\n" +
      "  node bin.js -u <username> -p <password>\n" +
      "  node bin.js -c <cookie_string>",
  );
}

type ParsedArgs =
  | { mode: "cookies"; cookies: string }
  | { mode: "login"; username: string; password: string };

function parseArgs(argv: string[]): ParsedArgs {
  let username: string | undefined;
  let password: string | undefined;
  let cookies: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-u") {
      const v = argv[++i];
      if (v === undefined) {
        console.error("-u requires a username");
        process.exit(1);
      }
      username = v;
    } else if (a === "-p") {
      const v = argv[++i];
      if (v === undefined) {
        console.error("-p requires a password");
        process.exit(1);
      }
      password = v;
    } else if (a === "-c") {
      const v = argv[++i];
      if (v === undefined) {
        console.error("-c requires a cookie string");
        process.exit(1);
      }
      cookies = v;
    } else {
      console.error(`Unknown argument: ${a}`);
      printUsage();
      process.exit(1);
    }
  }

  const hasLogin = username !== undefined || password !== undefined;
  const hasCookie = cookies !== undefined;

  if (hasLogin && hasCookie) {
    console.error("Use either -u/-p or -c, not both.");
    process.exit(1);
  }
  if (hasCookie) {
    return { mode: "cookies", cookies: cookies! };
  }
  if (username !== undefined && password !== undefined) {
    return { mode: "login", username, password };
  }

  printUsage();
  process.exit(1);
}

const parsed = parseArgs(process.argv.slice(2));

let cookies: string;
if (parsed.mode === "login") {
  cookies = await loginAmexHongKong(parsed.username, parsed.password);
} else {
  cookies = parsed.cookies;
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
