import puppeteer, { type HTTPResponse, type Page } from "puppeteer";

const LOGIN_URL =
  "https://www.americanexpress.com/en-hk/account/login?inav=hk_utility_login";

/** Names required by `api.ts` (`Cookie` header). */
const REQUIRED_COOKIES = ["amexsessioncookie", "aat"] as const;

function logTargetCookiesFromSetCookie(setCookieHeader: string | undefined): void {
  if (!setCookieHeader) return;
  const header = setCookieHeader;
  for (const name of REQUIRED_COOKIES) {
    const needle = `${name}=`;
    const lowerHeader = header.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let pos = 0;
    while (true) {
      const i = lowerHeader.indexOf(lowerNeedle, pos);
      if (i === -1) break;
      const prev = i === 0 ? undefined : header[i - 1];
      if (
        prev !== undefined &&
        prev !== " " &&
        prev !== ";" &&
        prev !== "\n" &&
        prev !== ","
      ) {
        pos = i + 1;
        continue;
      }
      const valueStart = i + needle.length;
      const semi = header.indexOf(";", valueStart);
      const end = semi === -1 ? header.length : semi;
      const value = header.slice(valueStart, end).trim();
      console.log(`[set-cookie] ${name}=${value}`);
      pos = end;
    }
  }
}

/**
 * Waits until both auth cookies appear in the page cookie jar (same source
 * of truth as document / subresource requests).
 */
async function waitForAuthCookieHeader(
  page: Page,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const jar = await page.cookies();
    const byLower = new Map<string, { name: string; value: string }>();
    for (const c of jar) {
      byLower.set(c.name.toLowerCase(), { name: c.name, value: c.value });
    }
    const parts: string[] = [];
    let complete = true;
    for (const n of REQUIRED_COOKIES) {
      const ent = byLower.get(n.toLowerCase());
      if (!ent?.value) {
        complete = false;
        break;
      }
      parts.push(`${ent.name}=${ent.value}`);
    }
    if (complete) return parts.join("; ");
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for cookies: ${REQUIRED_COOKIES.join(", ")}`,
  );
}

/**
 * Logs in on Amex HK, waits until `amexsessioncookie` and `aat` are stored,
 * then returns a `Cookie` header value suitable for `api.ts`.
 */
export async function loginAmexHongKong(
  username: string,
  password: string,
): Promise<string> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 90_000 });
    await page.waitForSelector("#eliloUserID", { timeout: 30_000 });
    await page.type("#eliloUserID", username);
    await page.type("#eliloPassword", password);

    const onResponse = (response: HTTPResponse): void => {
      logTargetCookiesFromSetCookie(response.headers()["set-cookie"]);
    };
    page.on("response", onResponse);

    const cookieHeaderPromise = waitForAuthCookieHeader(page, 90_000);

    const [cookieHeader] = await Promise.all([
      cookieHeaderPromise,
      (async () => {
        await Promise.all([
          page.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 90_000,
          }),
          page.click("#loginSubmit"),
        ]);
      })(),
    ]);

    page.off("response", onResponse);
    return cookieHeader;
  } finally {
    await browser.close();
  }
}
