import { CALLING_WINDOW } from "@/lib/constants";
import { addDays, todayIst } from "@/lib/dates";
import type { CallingWindow } from "@/lib/settings-defaults";

// Hour of `now` on the Indian clock, whatever timezone the server runs in.
const istHour = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value);
};

// True when a call may start right now: from the window's start hour up to (not including) its end hour, in IST.
// `now` and `window` are injectable so tests can fix the time; routes pass the Admin's setting, the default is lib/constants.ts.
export const isWithinCallingWindow = (now: Date = new Date(), window: CallingWindow = CALLING_WINDOW) => {
  const hour = istHour(now);
  return hour >= window.startHour && hour < window.endHour;
};

// When calling next opens: now if already open, else the start hour (IST) today before opening, or tomorrow after closing.
export const nextWindowStart = (now: Date = new Date(), window: CallingWindow = CALLING_WINDOW): Date => {
  if (isWithinCallingWindow(now, window)) return now;
  const open = (day: string) => new Date(`${day}T${String(window.startHour).padStart(2, "0")}:00:00+05:30`);
  const today = todayIst(now);
  const todayOpen = open(today);
  return now < todayOpen ? todayOpen : open(addDays(today, 1));
};

// 24-hour clock hour as "9 AM" / "7 PM" / "12 PM".
const hourLabel = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour % 24 < 12 ? "AM" : "PM"}`;

// The message shown (and returned with a 403) when a call is attempted outside the window.
export const callingWindowMessage = (window: CallingWindow = CALLING_WINDOW) =>
  `Calls are allowed between ${hourLabel(window.startHour)} and ${hourLabel(window.endHour)}`;
