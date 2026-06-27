import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextValue } from "@/components/auth-context";
import {
  clearRemember,
  getRememberPref,
  isRememberExpired,
  markExpiredNotice,
} from "@/lib/remember-login";

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
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;
      const accessToken = sessionData.session?.access_token ?? null;
      setUser(sessionUser);
      setReady(true);
      setIsAdmin(false);
      if (!sessionUser || !accessToken) {
        setUnread(0);
        return;
      }
      try {
        const { count } = await supabase
          .from("notifications" as never)
          .select("id", { count: "exact", head: true })
          .eq("user_id", sessionUser.id)
          .is("read_at", null);
        setUnread(count ?? 0);
      } catch {
        setUnread(0);
      }
    } catch {
      setUser(null);
      setReady(true);
      setIsAdmin(false);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
      } catch {
        if (cancelled) return;
        setUser(null);
        setReady(true);
      }
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (!session?.user) {
        setIsAdmin(false);
        setUnread(0);
        return;
      }
      setTimeout(() => {
        void refresh();
      }, 0);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      email: user?.email ?? null,
      isAdmin,
      unread,
      refresh,
      signOut,
    }),
    [ready, user, isAdmin, unread, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
