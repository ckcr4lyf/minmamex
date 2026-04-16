import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const saveDebugFile = async (debugDir: string, name: string, data: unknown, ext = "json"): Promise<void> => {
  await mkdir(debugDir, { recursive: true });
  const filePath = join(debugDir, `${name}.${ext}`);
  const content = ext === "json" ? JSON.stringify(data, null, 2) : String(data);
  await writeFile(filePath, content, "utf-8");
};
