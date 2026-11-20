import { describe, expect, it } from "bun:test";
import { updateRetailerSchema } from "./schemas";

const valid = { name: "Sharma Mobiles", ownerName: "Ramesh Sharma", mobile: "9876543210" };

describe("updateRetailerSchema (details)", () => {
  it("accepts the editable fields and ignores a code sent by the client (the code never changes)", () => {
    const r = updateRetailerSchema.safeParse({ ...valid, code: "HACK-1" });
    expect(r.success).toBe(true);
    if (r.success) expect("code" in r.data).toBe(false);
  });

  it("rejects a bad mobile and email", () => {
    expect(updateRetailerSchema.safeParse({ ...valid, mobile: "98765" }).success).toBe(false);
    expect(updateRetailerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
});

describe("updateRetailerSchema", () => {
  it("accepts a status change on its own", () => {
    expect(updateRetailerSchema.safeParse({ status: "INACTIVE" }).success).toBe(true);
  });

  it("clears an optional field when it is sent empty, and leaves it alone when it is left out", () => {
    const r = updateRetailerSchema.safeParse({ email: "", city: "Indore" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBeNull();
      expect(r.data.city).toBe("Indore");
      expect("address" in r.data && r.data.address !== undefined).toBe(false);
    }
    expect(updateRetailerSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("rejects an empty body, an unknown status and drops an attempt to change the code", () => {
    expect(updateRetailerSchema.safeParse({}).success).toBe(false);
    expect(updateRetailerSchema.safeParse({ status: "GONE" }).success).toBe(false);
    const r = updateRetailerSchema.safeParse({ code: "NEW-1", name: "Shop" });
    expect(r.success && "code" in r.data).toBe(false);
  });
});
