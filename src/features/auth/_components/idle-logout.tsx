"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { useSignOut } from "../hooks/use-sign-out";

// Minutes without any mouse, key, touch or scroll activity before the user is signed out (project.md: automatic logout).
const IDLE_MINUTES = 30;

// Events that count as "the user is still here".
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * @component IdleLogout
 * @description Renders nothing; signs the user out after IDLE_MINUTES of inactivity and sends them to the sign-in page.
 */
export const IdleLogout = () => {
  const router = useRouter();
  const { mutate: signOut } = useSignOut();
  // Pending idle timer — reset on every activity event and cleared on unmount.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const expire = () =>
      signOut(undefined, {
        onSuccess: () => {
          toast.add({ title: "Signed out", description: "You were inactive for a while, so we signed you out.", type: "info" });
          router.replace("/sign-in");
        },
      });
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(expire, IDLE_MINUTES * 60 * 1000);
    };
    reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router, signOut]);

  return null;
};
