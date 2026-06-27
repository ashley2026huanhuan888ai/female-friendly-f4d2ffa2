import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { getAdminUnreadCounts } from "@/lib/api/platform.functions";

const STORAGE_KEYS = {
  comments: "admin_unread_last_comments",
  feedback: "admin_unread_last_feedback",
  objects: "admin_unread_last_objects",
} as const;

export type UnreadSection = keyof typeof STORAGE_KEYS;

interface UnreadState {
  comments: number;
  feedback: number;
  objects: number;
}

function getLastViewed(section: UnreadSection): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  const stored = localStorage.getItem(STORAGE_KEYS[section]);
  return stored || new Date(0).toISOString();
}

export function useAdminUnread() {
  const fetchCounts = useServerFn(getAdminUnreadCounts);
  const [unread, setUnread] = useState<UnreadState>({ comments: 0, feedback: 0, objects: 0 });
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchCounts({
        data: {
          comments_since: getLastViewed("comments"),
          feedback_since: getLastViewed("feedback"),
          objects_since: getLastViewed("objects"),
        },
      });
      setUnread({
        comments: result.comments_unread,
        feedback: result.feedback_unread,
        objects: result.objects_unread,
      });
    } catch {
      // silently fail — badges won't render
    } finally {
      setLoaded(true);
    }
  }, [fetchCounts]);

  useEffect(() => {
    load();
  }, [load]);

  const markViewed = useCallback((section: UnreadSection) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS[section], new Date().toISOString());
    setUnread((prev) => ({ ...prev, [section]: 0 }));
  }, []);

  return { unread, loaded, markViewed };
}
