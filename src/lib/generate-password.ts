const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O: easy to misread when read out over the phone
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l/o
const DIGITS = "23456789"; // no 0/1
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

// Random integer in [0, max) from the crypto source (never Math.random); rejection sampling avoids modulo bias.
const randomInt = (max: number) => {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
};

// One random character from `chars`.
const pick = (chars: string) => chars[randomInt(chars.length)];

// Builds a strong password (default 10 chars) with at least one capital, small letter, number and symbol, shuffled.
export const generatePassword = (length = 10) => {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < Math.max(length, 8)) chars.push(pick(ALL));
  // Fisher-Yates shuffle so the guaranteed characters are not always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
