"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/components/app-loading-screen";
import { useMe } from "../hooks/use-me";

/**
 * @component AuthGate
 * @description Holds the app behind the logo-animation loading screen until /auth/me resolves; if it fails (session gone) sends the user to /sign-in.
 */
export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { isPending, isError } = useMe();

  useEffect(() => {
    if (isError) router.replace("/sign-in");
  }, [isError, router]);

  if (isPending || isError) return <AppLoadingScreen />;
  return children;
};
