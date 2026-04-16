import { getLogger } from "./logger.js";

const LOG = getLogger();

export type CardInfo = {
  id: string;
  name: string;
};

function decodeTransitArray(arr: unknown[]): unknown {
  if (arr.length === 0) return arr;

  const tag = arr[0];

  if (tag === "~#iM") {
    const pairs = arr[1] as unknown[];
    const map = new Map<string | number, unknown>();
    for (let i = 0; i < pairs.length; i += 2) {
      const key = decodeTransit(pairs[i]);
      const value = decodeTransit(pairs[i + 1]);
      map.set(key as string, value);
    }
    return map;
  }

  if (tag === "~#iL") {
    const items = arr[1] as unknown[];
    return items.map(item => decodeTransit(item));
  }

  if (tag === "^ ") {
    const pairs = arr.slice(1) as unknown[];
    const map = new Map<string | number, unknown>();
    for (let i = 0; i < pairs.length; i += 2) {
      const key = decodeTransit(pairs[i]);
      const value = decodeTransit(pairs[i + 1]);
      map.set(key as string, value);
    }
    return map;
  }

  if (tag === "~:") {
    return String(arr[1]);
  }

  if (tag === "~t") return true;
  if (tag === "~f") return false;
  if (tag === "~n") return null;

  return arr;
}

function decodeTransit(val: unknown): unknown {
  if (Array.isArray(val)) {
    return decodeTransitArray(val);
  }
  return val;
}

export function extractCardsFromHtml(html: string): CardInfo[] {
  const startMarker = 'window.__INITIAL_STATE__ = "';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    LOG.debug("Could not find window.__INITIAL_STATE__ in HTML");
    return [];
  }

  const jsonStart = startIdx + startMarker.length;
  const endMarker = '";';
  const endIdx = html.indexOf(endMarker, jsonStart);

  if (endIdx === -1) {
    LOG.debug("Could not find end of window.__INITIAL_STATE__");
    return [];
  }

  const rawStr = html.slice(jsonStart, endIdx);
  const unescaped = rawStr.replace(/\\"/g, '"');

  let transitJson: unknown;
  try {
    transitJson = JSON.parse(unescaped);
  } catch (e) {
    LOG.debug(`Failed to parse transit JSON: ${e}`);
    return [];
  }

  const state = decodeTransit(transitJson) as Map<string, unknown>;

  const modules = state.get("modules") as Map<string, unknown>;
  const consumerNav = modules?.get("axp-consumer-navigation") as Map<string, unknown>;
  const products = consumerNav?.get("products") as Map<string, unknown>;
  const details = products?.get("details") as Map<string, unknown>;
  const types = details?.get("types") as Map<string, unknown>;
  const cardProduct = types?.get("CARD_PRODUCT") as Map<string, unknown>;

  if (!cardProduct) {
    LOG.debug("CARD_PRODUCT not found in state");
    return [];
  }

  const productsOrder = cardProduct.get("productsOrder") as string[];
  const productsList = cardProduct.get("productsList") as Map<string, Map<string, unknown>>;

  if (!productsOrder || !productsList) {
    LOG.debug("productsOrder or productsList not found");
    return [];
  }

  const cards: CardInfo[] = [];

  for (const token of productsOrder) {
    const cardData = productsList.get(token);
    if (cardData) {
      const product = cardData.get("product") as Map<string, unknown>;
      const name = product?.get("description") as string;
      const id = cardData.get("account_token") as string;
      if (name && id) {
        cards.push({ id, name });
      }
    }
  }

  LOG.debug(`Extracted ${cards.length} cards from HTML`);
  return cards;
}
