import { expect, test } from "bun:test";
import { generatePassword } from "./generate-password";

test("password has the requested length and all four character classes", () => {
  for (let i = 0; i < 200; i++) {
    const p = generatePassword(10);
    expect(p).toHaveLength(10);
    expect(p).toMatch(/[A-Z]/);
    expect(p).toMatch(/[a-z]/);
    expect(p).toMatch(/[0-9]/);
    expect(p).toMatch(/[!@#$%&*?]/);
  }
});

test("two passwords differ and short lengths are raised to 8", () => {
  expect(generatePassword()).not.toBe(generatePassword());
  expect(generatePassword(3)).toHaveLength(8);
});
