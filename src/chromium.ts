import { accessSync, constants } from "node:fs";
import { execSync } from "node:child_process";
import { getLogger } from "./logger.js";

const LOG = getLogger();

const LINUX_BINARIES = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
] as const;

export const findChromium = (): string | undefined => {
  if (process.platform !== "linux") return undefined;

  for (const binary of LINUX_BINARIES) {
    try {
      accessSync(binary, constants.X_OK);
      const version = execSync(`"${binary}" --version`, { encoding: "utf-8" }).trim();
      LOG.info(`Found Chromium: ${binary} (${version})`);
      return binary;
    } catch {
      // binary not found or not executable
    }
  }

  LOG.info("No system Chromium found, using puppeteer default");
  return undefined;
};
