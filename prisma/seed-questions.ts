import { prisma } from "../src/lib/prisma";

// Dev/test customer questions, a few per category, so the Questions page and the "Customer query & response" card on a case have something to
// show. The last one is inactive (agents don't see it). Safe to re-run: a question already there (same category and text) is left alone, so
// edits an Admin made are never overwritten.
const QUESTIONS = [
  { category: "CUSTOMER_VERIFICATION", text: "Can you confirm your full name and date of birth?", active: true },
  { category: "CUSTOMER_VERIFICATION", text: "Is this the address where you currently live?", active: true },
  { category: "PAYMENT_RELATED", text: "Have you already made any payment towards this loan recently?", active: true },
  { category: "PAYMENT_RELATED", text: "Which mode of payment is convenient for you: cash, UPI or bank transfer?", active: true },
  { category: "LOAN_RELATED", text: "Are you aware of the overdue amount and the due date of your EMI?", active: true },
  { category: "LOAN_RELATED", text: "Do you have any concern about the loan amount or charges?", active: true },
  { category: "PAYMENT_DELAY_REASON", text: "Why is your payment delayed?", active: true },
  { category: "PAYMENT_DELAY_REASON", text: "Has your income or job situation changed recently?", active: true },
  { category: "PROMISE_TO_PAY", text: "When can you make the payment?", active: true },
  { category: "PROMISE_TO_PAY", text: "Can you pay the full overdue amount?", active: true },
  { category: "FOLLOW_UP_RELATED", text: "What is the best time and number to reach you again?", active: true },
  { category: "FOLLOW_UP_RELATED", text: "Should we speak to anyone else in your family about this?", active: true },
  { category: "GENERAL_QUERIES", text: "Do you have any other question or request for us?", active: true },
  { category: "GENERAL_QUERIES", text: "Would you like a visit from our representative?", active: false },
] as const;

export const seedQuestions = async (createdById: string) => {
  // Display order counts up within each category, in the order listed above.
  const next: Record<string, number> = {};
  for (const q of QUESTIONS) {
    next[q.category] = (next[q.category] ?? 0) + 1;
    const exists = await prisma.customerQuestion.findFirst({ where: { category: q.category, text: q.text }, select: { id: true } });
    if (!exists) await prisma.customerQuestion.create({ data: { ...q, displayOrder: next[q.category], createdById } });
  }
};
