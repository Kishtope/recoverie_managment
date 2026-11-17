"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// The browser event that lets a page offer "install this app" (Chrome, Edge, Android; not in the TypeScript DOM types).
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Nothing to subscribe to: these browser facts do not change while the page is open.
const subscribe = () => () => {};
// Already running as an installed app (home-screen icon), on Android / desktop or on iPhone.
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
// iPhone / iPad Safari never fires the install event; people there have to use Share, then Add to Home Screen.
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Whether and how to offer "Install app". `canInstall` turns true when the browser says the app is installable (the saved event), and
 * `install()` shows its prompt. On iPhone `showIosHint` is true instead, because there is no prompt to trigger. Everything is false
 * while rendering on the server and once the app is already installed, so the button simply is not there.
 */
export const useInstallPrompt = () => {
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => false);
  const ios = useSyncExternalStore(subscribe, isIos, () => false);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    // Keep the event for later instead of letting the browser show its own mini bar at a random moment.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Shows the browser's install prompt; the saved event works once, so it is dropped afterwards.
  const install = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }, [event]);

  return { canInstall: !standalone && !!event, showIosHint: !standalone && ios && !event, install };
};
