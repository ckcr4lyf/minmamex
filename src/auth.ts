import puppeteer from "puppeteer";
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { getLogger } from "./logger.js";
import { saveDebugFile, saveDebugScreenshot } from "./debug.js";

const puppeteerExtra = addExtra(puppeteer as unknown as import("puppeteer-extra").VanillaPuppeteer);
puppeteerExtra.use(StealthPlugin());

const LOG = getLogger();
const LOGIN_URL =
  "https://www.americanexpress.com/en-hk/account/login?inav=hk_utility_login";

/** Names required by `api.ts` (`Cookie` header). */
const REQUIRED_COOKIES = ["amexsessioncookie", "aat"] as const;

const debugCapture = async (page: puppeteer.Page, debugDir: string, step: string) => {
  const screenshot = await page.screenshot();
  await saveDebugScreenshot(debugDir, `login_${step}`, Buffer.from(screenshot));
  const html = await page.content();
  await saveDebugFile(debugDir, `login_${step}`, html, "html");
};

/**
 * Logs in on Amex HK, waits until `amexsessioncookie` and `aat` are stored,
 * then returns a `Cookie` header value suitable for `api.ts`.
 */
export async function loginAmexHongKong(
  username: string,
  password: string,
  debugDir?: string,
): Promise<string> {
  LOG.debug("Launching puppeteer...");
  const browser = await puppeteerExtra.launch({ 
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--remote-debugging-port=9239',
    ],
   });
  LOG.debug("Puppeteer launched.");
  let page: puppeteer.Page | undefined;
  let context: puppeteer.BrowserContext | undefined;
  try {
    context = await browser.createBrowserContext();
    page = await context.newPage();

    LOG.debug("Navigating to login page...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 15_000 });
    LOG.debug("Login page loaded.");
    await new Promise(resolve => setTimeout(resolve, 10_000));
    await page.waitForSelector("#eliloUserID", { timeout: 30_000 });
    if (debugDir) await debugCapture(page, debugDir, "01_navigated");
    LOG.debug("Filling login form...");
    await page.click("#eliloUserID");
    await page.type("#eliloUserID", username, { delay: 200 + Math.random() * 200 });
    await page.click("#eliloPassword");
    await page.type("#eliloPassword", password, { delay: 200 + Math.random() * 200 });
    if (debugDir) await debugCapture(page, debugDir, "02_filled");
    LOG.debug("Submitting login form...");
    await page.click("#loginSubmit");
    LOG.debug("Login submitted, waiting for navigation...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 });
    if (debugDir) await debugCapture(page, debugDir, "03_submitted");
    LOG.info("Logged in successfully.");

    const cookies = await context.cookies();
    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
    LOG.debug("Cookies extracted.");
    if (debugDir) await saveDebugFile(debugDir, "login_cookies", cookies);
    return cookieHeader;
  } catch (error) {
    LOG.error(`Login failed`, error);
    throw error;
  } finally {
    if (debugDir && page) {
      try { await debugCapture(page, debugDir, "04_end"); } catch { /* ignore */ }
    }
    await browser.close();
  }
}
