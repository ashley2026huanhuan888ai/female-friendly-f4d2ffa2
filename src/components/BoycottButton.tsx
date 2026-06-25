import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { getBoycottStatus, isBoycotting, toggleBoycott, getMyBoycottCount } from "@/lib/api/boycotts.functions";

export function BoycottButton({ objectId }: { objectId: string }) {
  const { ready, user } = useAuth();
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [celebrate, setCelebrate] = useState<{ open: boolean; n: number }>({ open: false, n: 0 });
  const router = useRouter();
  const getStatus = useServerFn(getBoycottStatus);
  const checkMine = useServerFn(isBoycotting);
  const toggle = useServerFn(toggleBoycott);
  const myCount = useServerFn(getMyBoycottCount);

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
      if (r.mine) {
        try {
          const { count: n } = await myCount();
          setCelebrate({ open: true, n });
        } catch {
          // ignore celebration failure
        }
      }
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

      {celebrate.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
          onClick={() => setCelebrate({ open: false, n: 0 })}
        >
          <div
            className="w-full max-w-md border border-accent/40 bg-paper p-7 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] uppercase tracking-[0.25em] text-accent">
              第 {celebrate.n} 次抵制
            </div>
            <h3 className="mt-3 font-serif text-2xl leading-snug">
              恭喜你，守住了边界。
            </h3>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-serif text-6xl leading-none text-accent tabular-nums">
                {celebrate.n}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                次 / boycotts
              </span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {celebrate.n === 1 ? (
                <>你的第一次抵制，从今天起算。</>
              ) : (
                <>我，不忍受冒犯。</>
              )}
              <br />
              这是我的第 <span className="text-accent font-medium">{celebrate.n}</span> 次抵制——每一次都在告诉世界：
              <br />
              我会守住我的边界。
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setCelebrate({ open: false, n: 0 })}
                className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background transition hover:bg-accent hover:border-accent"
              >
                我真棒
              </button>
              <Link
                to="/leaderboard"
                onClick={() => setCelebrate({ open: false, n: 0 })}
                className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground"
              >
                去贡献榜看看
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
