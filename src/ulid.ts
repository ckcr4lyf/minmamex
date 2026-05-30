import { randomBytes } from "node:crypto";

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encodeTime = (time: number, length: number): string => {
  let str = "";
  for (let i = length - 1; i >= 0; i--) {
    str = ENCODING.charAt(time % 32) + str;
    time = Math.floor(time / 32);
  }
  return str;
};

const encodeRandom = (bytes: Uint8Array, length: number): string => {
  let str = "";
  for (let i = 0; i < length; i++) {
    str += ENCODING.charAt(bytes[i] % 32);
  }
  return str;
};

export const ulid = (): string => {
  const time = Date.now();
  const rand = randomBytes(10);
  return encodeTime(time, 10) + encodeRandom(rand, 16);
};
