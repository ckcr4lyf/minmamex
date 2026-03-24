import puppeteer from "puppeteer";

const LOGIN_URL =
  "https://www.americanexpress.com/en-hk/account/login?inav=hk_utility_login";

/** Names required by `api.ts` (`Cookie` header). */
const REQUIRED_COOKIES = ["amexsessioncookie", "aat"] as const;

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
    await page.click("#loginSubmit");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90_000 });

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
    return cookieHeader;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
