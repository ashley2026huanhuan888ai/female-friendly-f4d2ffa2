import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { getBoycottStatus, isBoycotting, toggleBoycott } from "@/lib/api/boycotts.functions";

export function BoycottButton({ objectId }: { objectId: string }) {
  const { ready, user } = useAuth();
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const router = useRouter();
  const getStatus = useServerFn(getBoycottStatus);
  const checkMine = useServerFn(isBoycotting);
  const toggle = useServerFn(toggleBoycott);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getStatus({ data: { object_id: objectId } });
        if (!cancelled) setCount(s.count);
        if (user) {
          const m = await checkMine({ data: { object_id: objectId } });
          if (!cancelled) setMine(m.mine);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, objectId, getStatus, checkMine]);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setShowPrompt(true);
      return;
    }
    setBusy(true);
    // optimistic
    setMine((m) => !m);
    setCount((c) => c + (mine ? -1 : 1));
    try {
      const r = await toggle({ data: { object_id: objectId } });
      setMine(r.mine);
      setCount(r.count);
    } catch (err) {
      // revert
      setMine((m) => !m);
      setCount((c) => c + (mine ? 1 : -1));
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const redirect = router.state.location.pathname;
  const label = mine ? "已抵制" : "抵制";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading || busy}
        aria-pressed={mine}
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs tabular-nums transition ${
          mine
            ? "border-accent bg-accent/10 text-accent"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
        }`}
      >
        <span>✋</span>
        <span>{label}</span>
        <span className="text-[11px] opacity-80">· {count}</span>
      </button>

      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="w-full max-w-md border border-border bg-paper p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              需要登录
            </div>
            <h3 className="mt-2 font-serif text-xl">登录后即可抵制</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              登录账号才能为对象表达抵制态度。
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                to="/login"
                search={{ redirect }}
                className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
              >
                继续登录
              </Link>
              <button
                onClick={() => setShowPrompt(false)}
                className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
