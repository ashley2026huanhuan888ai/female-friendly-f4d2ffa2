import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserAccess } from "@/lib/api/platform.functions";

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  email: string | null;
  isAdmin: boolean;
  unread: number;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const getAccess = useServerFn(getCurrentUserAccess);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
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
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setReady(true);
      if (sessionUser) void refresh();
    });
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
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    user,
    email: user?.email ?? null,
    isAdmin,
    unread,
    refresh,
  }), [ready, user, isAdmin, unread]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}