import type { ImportRowError } from "@/features/imports/types";
import type { RetailerImportSummary } from "@/features/retailers/types";

// Most retailer customers one retailer may receive from a single uploaded file (Retailer module, BR-05).
export const RETAILER_CAP = 20;

// A retailer as the upload sees it: enough to match a code, check it is active and name it in the summary.
export type KnownRetailer = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE" };

// The part of a validated Loans row the retailer rules need.
export type RetailerRowInput = { row: number; agreementNo: string; assignmentType: "CALLER" | "RETAILER"; retailerCode?: string };

export type RetailerCheck = {
  // Row number -> retailer id, for the Retailer rows that passed every check. Caller rows are not in here.
  retailerIds: Map<number, string>;
  // Rows rejected by a retailer rule (unknown / inactive code, missing code, retailer over the cap).
  errors: ImportRowError[];
  summary: RetailerImportSummary;
};

// Normalises a retailer code for matching: case and surrounding spaces do not matter ("kpd-1 " == "KPD-1").
const codeKey = (code: string) => code.trim().toUpperCase();

// Applies the retailer rules of one uploaded file (BR-03..BR-08): a Retailer row needs a code that exists and is active, and one retailer takes at
// most RETAILER_CAP rows from the file, the first ones in file order. The code in the file decides the retailer; nothing is ever moved to another
// retailer to even the counts, a row that does not fit is rejected instead. Caller rows pass through untouched. Pure (no DB), so the preview and the
// real import always agree.
export const checkRetailerRows = (rows: RetailerRowInput[], retailers: KnownRetailer[]): RetailerCheck => {
  const byCode = new Map(retailers.map((r) => [codeKey(r.code), r]));
  const accepted = new Map<string, number>(); // retailer id -> rows accepted so far
  const rejected = new Map<string, number>(); // retailer id -> rows rejected for capacity / status
  const retailerIds = new Map<number, string>();
  const errors: ImportRowError[] = [];
  let caller = 0;

  const reject = (row: number, agreementNo: string, reason: string) => errors.push({ row, agreementNo, reason });

  for (const r of rows) {
    if (r.assignmentType === "CALLER") {
      caller += 1;
      continue;
    }
    if (!r.retailerCode?.trim()) {
      reject(r.row, r.agreementNo, "Retailer Code is blank (needed for Retailer rows)");
      continue;
    }
    const retailer = byCode.get(codeKey(r.retailerCode));
    if (!retailer) {
      reject(r.row, r.agreementNo, `Retailer Code "${r.retailerCode.trim()}" is not a known retailer`);
      continue;
    }
    if (retailer.status !== "ACTIVE") {
      rejected.set(retailer.id, (rejected.get(retailer.id) ?? 0) + 1);
      reject(r.row, r.agreementNo, `Retailer ${retailer.code} is inactive and cannot receive customers`);
      continue;
    }
    const taken = accepted.get(retailer.id) ?? 0;
    if (taken >= RETAILER_CAP) {
      rejected.set(retailer.id, (rejected.get(retailer.id) ?? 0) + 1);
      reject(r.row, r.agreementNo, `Retailer ${retailer.code} can take only ${RETAILER_CAP} customers per upload; this customer was left out (upload it in a later file)`);
      continue;
    }
    accepted.set(retailer.id, taken + 1);
    retailerIds.set(r.row, retailer.id);
  }

  const perRetailer = retailers
    .filter((r) => accepted.has(r.id) || rejected.has(r.id))
    .map((r) => ({ retailerId: r.id, code: r.code, name: r.name, customers: accepted.get(r.id) ?? 0, rejected: rejected.get(r.id) ?? 0 }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return { retailerIds, errors, summary: { caller, retailer: retailerIds.size, perRetailer } };
};
