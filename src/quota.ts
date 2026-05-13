const MAX_GLOBAL = 20;
const MAX_PER_IP = 3;

const getHourKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}`;
};

let currentWindow = getHourKey();
let globalCount = 0;
const ipCounts = new Map<string, number>();

const resetIfNewWindow = () => {
  const window = getHourKey();
  if (window !== currentWindow) {
    currentWindow = window;
    globalCount = 0;
    ipCounts.clear();
  }
};

export const checkRateLimit = (ip: string): { allowed: boolean; globalRemaining: number; ipRemaining: number } => {
  resetIfNewWindow();

  const ipCurrent = ipCounts.get(ip) ?? 0;

  if (globalCount >= MAX_GLOBAL || ipCurrent >= MAX_PER_IP) {
    return {
      allowed: false,
      globalRemaining: Math.max(0, MAX_GLOBAL - globalCount),
      ipRemaining: Math.max(0, MAX_PER_IP - ipCurrent),
    };
  }

  globalCount++;
  ipCounts.set(ip, ipCurrent + 1);

  return {
    allowed: true,
    globalRemaining: Math.max(0, MAX_GLOBAL - globalCount),
    ipRemaining: Math.max(0, MAX_PER_IP - ipCurrent - 1),
  };
};

export const getQuota = (ip: string): { globalRemaining: number; ipRemaining: number } => {
  resetIfNewWindow();

  return {
    globalRemaining: Math.max(0, MAX_GLOBAL - globalCount),
    ipRemaining: Math.max(0, MAX_PER_IP - (ipCounts.get(ip) ?? 0)),
  };
};
