import { expect, test } from "bun:test";
import { maskMobile } from "./mask";

test("masks the middle of a mobile number", () => {
  expect(maskMobile("9812345621")).toBe("98XXXXXX21");
  expect(maskMobile(null)).toBeNull();
  expect(maskMobile("123")).toBe("XXX");
});
