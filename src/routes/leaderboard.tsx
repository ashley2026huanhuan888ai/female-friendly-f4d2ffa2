import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { getLeaderboard } from "@/lib/api/contribution.functions";
import {
  getObjectBoycottLeaderboard,
  getUserBoycottLeaderboard,
} from "@/lib/api/boycotts.functions";

type Mode = "contribution" | "boycott_object" | "boycott_user";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "贡献榜 · 女性友好" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const fetchLB = useServerFn(getLeaderboard);
  const fetchObjBoycott = useServerFn(getObjectBoycottLeaderboard);
  const fetchUserBoycott = useServerFn(getUserBoycottLeaderboard);
  const [mode, setMode] = useState<Mode>("contribution");
  const [range, setRange] = useState<"all" | "week" | "month">("all");
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    setRows(null);
    if (mode === "contribution") {
      fetchLB({ data: { range, limit: 50 } }).then(setRows);
    } else if (mode === "boycott_object") {
      fetchObjBoycott({ data: { limit: 50 } }).then(setRows);
    } else {
      fetchUserBoycott({ data: { limit: 50 } }).then(setRows);
    }
  }, [mode, range, fetchLB, fetchObjBoycott, fetchUserBoycott]);

  const title = mode === "contribution" ? "贡献榜" : mode === "boycott_object" ? "对象抵制榜" : "用户抵制榜";
  const subtitle =
    mode === "contribution"
      ? "每一次观察、每一次邀请，都让这里更明亮。"
      : mode === "boycott_object"
      ? "被最多人按下「抵制」的对象。"
      : "最积极表达抵制态度的用户。";

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Leaderboard</div>
          <h1 className="mt-3 font-serif text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex border border-border">
              {([
                ["contribution", "贡献"],
                ["boycott_object", "对象抵制"],
                ["boycott_user", "用户抵制"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={`px-4 py-2 text-xs uppercase tracking-wider ${
                    mode === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "contribution" && (
              <div className="inline-flex border border-border">
                {([
                  ["all", "总榜"],
                  ["month", "本月"],
                  ["week", "本周"],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setRange(k)}
                    className={`px-4 py-2 text-xs uppercase tracking-wider ${
                      range === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {rows === null ? (
            <div className="py-20 text-center text-sm text-muted-foreground">加载中…</div>
          ) : rows.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              还没有人上榜
            </div>
          ) : mode === "boycott_object" ? (
            <ol className="divide-y divide-border border-y border-border">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <div className={`w-8 text-center font-serif text-xl ${
                    i === 0 ? "text-accent" : i < 3 ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/objects/$id"
                      params={{ id: r.id }}
                      className="block truncate text-sm font-medium hover:text-accent"
                    >
                      {r.name}
                    </Link>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.type}</div>
                  </div>
                  <div className="font-serif text-lg text-accent tabular-nums">{r.count}</div>
                </li>
              ))}
            </ol>
          ) : mode === "boycott_user" ? (
            <ol className="divide-y divide-border border-y border-border">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <div className={`w-8 text-center font-serif text-xl ${
                    i === 0 ? "text-accent" : i < 3 ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full border border-border bg-card" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{r.display_name ?? r.id.slice(0, 8)}</div>
                    <div className="text-[11px] text-muted-foreground">抵制对象数</div>
                  </div>
                  <div className="font-serif text-lg text-accent tabular-nums">{r.count}</div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="divide-y divide-border border-y border-border">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <div className={`w-8 text-center font-serif text-xl ${
                    i === 0 ? "text-accent" : i < 3 ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full border border-border bg-card" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.display_name ?? r.id.slice(0, 8)}</div>
                    <div className="text-[11px] text-muted-foreground">L{r.level} · {r.level_title}</div>
                  </div>
                  <div className="font-serif text-lg text-accent">{Number(r.points).toFixed(2)}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
