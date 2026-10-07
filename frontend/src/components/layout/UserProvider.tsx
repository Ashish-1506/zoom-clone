"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { clearAuthToken, getCurrentUser } from "@/lib/api";
import type { User } from "@/lib/types";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your profile.",
      );
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    clearAuthToken(false);
    setUser(null);
    router.push("/signed-out");
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refreshUser().catch(() => undefined);
    }, 0);
    const handleAuthChange = () => void refreshUser().catch(() => undefined);
    window.addEventListener("zoom:auth-changed", handleAuthChange);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("zoom:auth-changed", handleAuthChange);
    };
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, error, refreshUser, setUser, signOut }),
    [error, loading, refreshUser, signOut, user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used inside UserProvider.");
  }
  return context;
}
