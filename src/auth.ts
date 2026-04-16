import puppeteer from "puppeteer";
import { getLogger } from "./logger.js";

const LOG = getLogger();
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
  LOG.debug("Launching puppeteer...");
  const browser = await puppeteer.launch({ headless: true });
  LOG.debug("Puppeteer launched.");
  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    LOG.debug("Navigating to login page...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 90_000 });
    LOG.debug("Login page loaded.");
    await page.waitForSelector("#eliloUserID", { timeout: 30_000 });
    LOG.debug("Filling login form...");
    await page.type("#eliloUserID", username);
    await page.type("#eliloPassword", password);
    LOG.debug("Submitting login form...");
    await page.click("#loginSubmit");
    LOG.debug("Login submitted, waiting for navigation...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90_000 });
    LOG.info("Logged in successfully.");

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
    LOG.debug("Cookies extracted.");
    return cookieHeader;
  } catch (error) {
    LOG.error(`Login failed: ${error}`);
    throw error;
  } finally {
    await browser.close();
  }
}
