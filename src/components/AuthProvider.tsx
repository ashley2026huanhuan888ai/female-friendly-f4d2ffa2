import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserAccess } from "@/lib/api/platform.functions";
import {
  clearRemember,
  getRememberPref,
  isRememberExpired,
  markExpiredNotice,
} from "@/lib/remember-login";

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  email: string | null;
  isAdmin: boolean;
  unread: number;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function enforceExpiry(): Promise<boolean> {
  // returns true if signed out due to expiry / no-remember
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;
    const remembered = getRememberPref();
    if (!remembered) {
      // user did not choose to be remembered; drop any persisted session
      await supabase.auth.signOut();
      clearRemember();
      return true;
    }
    if (isRememberExpired()) {
      await supabase.auth.signOut();
      clearRemember();
      markExpiredNotice();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const getAccess = useServerFn(getCurrentUserAccess);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user ?? null;
    setUser(sessionUser);
    setReady(true);
    if (!sessionUser) {
      setIsAdmin(false);
      setUnread(0);
      return;
    }
    try {
      const [access, { count }] = await Promise.all([
        getAccess({}),
        supabase
          .from("notifications" as never)
          .select("id", { count: "exact", head: true })
          .eq("user_id", sessionUser.id)
          .is("read_at", null),
      ]);
      setIsAdmin(access.isAdmin);
      setUnread(count ?? 0);
    } catch {
      setIsAdmin(false);
      setUnread(0);
    }
  }, [getAccess]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const expired = await enforceExpiry();
      if (cancelled) return;
      if (expired) {
        setUser(null);
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setReady(true);
      if (sessionUser) void refresh();
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (!session?.user) {
        setIsAdmin(false);
        setUnread(0);
        return;
      }
      setTimeout(() => { void refresh(); }, 0);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    clearRemember();
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    user,
    email: user?.email ?? null,
    isAdmin,
    unread,
    refresh,
    signOut,
  }), [ready, user, isAdmin, unread, refresh, signOut]);


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}