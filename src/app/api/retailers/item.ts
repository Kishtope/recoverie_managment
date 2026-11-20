import type { Prisma } from "@/generated/prisma/client";
import type { RetailerItem } from "@/features/retailers/types";

// What a list / detail query selects for one retailer, including how many customers it holds.
export const retailerSelect = {
  id: true,
  code: true,
  name: true,
  ownerName: true,
  mobile: true,
  email: true,
  address: true,
  city: true,
  status: true,
  createdAt: true,
  _count: { select: { customers: true } },
} satisfies Prisma.RetailerSelect;

export type RetailerRow = Prisma.RetailerGetPayload<{ select: typeof retailerSelect }>;

// Database row -> JSON for the API.
export const toRetailerItem = (r: RetailerRow): RetailerItem => ({
  id: r.id,
  code: r.code,
  name: r.name,
  ownerName: r.ownerName,
  mobile: r.mobile,
  email: r.email,
  address: r.address,
  city: r.city,
  status: r.status,
  customerCount: r._count.customers,
  createdAt: r.createdAt.toISOString(),
});
