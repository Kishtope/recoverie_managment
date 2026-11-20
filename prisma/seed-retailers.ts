import { prisma } from "../src/lib/prisma";

// Dev/test retailers: two active and one inactive, so the Retailers page, the upload's Retailer Code mapping (rows for the inactive one must be
// rejected) and the status filter can all be tried. Seeded customers start without a retailer. Safe to re-run: upserts by code and never touches assignments.
const RETAILERS = [
  { code: "RT-001", name: "Sharma Mobiles", ownerName: "Ramesh Sharma", mobile: "9000000101", email: "sharma.mobiles@example.com", city: "Balaghat", address: "Main Road, Balaghat", status: "ACTIVE" },
  { code: "RT-002", name: "Verma Electronics", ownerName: "Sunil Verma", mobile: "9000000102", email: null, city: "Katni", address: "Station Road, Katni", status: "ACTIVE" },
  { code: "RT-003", name: "Gupta Traders", ownerName: "Anil Gupta", mobile: "9000000103", email: null, city: "Seoni", address: "Bus Stand Chowk, Seoni", status: "INACTIVE" },
] as const;

export const seedRetailers = async () => {
  for (const r of RETAILERS) {
    // `status` is left out of the update so a retailer the Admin switched off or on is not flipped back by a re-seed.
    const { status, ...details } = r;
    await prisma.retailer.upsert({ where: { code: r.code }, update: details, create: { ...details, status } });
  }
};
