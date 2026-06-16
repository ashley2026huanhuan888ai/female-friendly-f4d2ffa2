import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  checkProductionCommit,
  comparePreviewProduction,
} from "@/lib/api/publish-check.functions";
import { APP_COMMIT, PREVIEW_ORIGIN, PRODUCTION_ORIGIN } from "@/lib/build-info";

export const Route = createFileRoute("/admin/publish")({
  head: () => ({ meta: [{ title: "发布校验 · 管理后台" }] }),
  component: PublishCheckPage,
});

function short(c: string | null | undefined) {
  return c ? c.slice(0, 7) : "—";
}

function fmt(t: string | null | undefined) {
  if (!t) return "—";
  try {
    return new Date(t).toLocaleString();
  } catch {
    return t;
  }
}

function PublishCheckPage() {
  const compare = useServerFn(comparePreviewProduction);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["publish-check", "compare"],
    queryFn: () => compare({}),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">发布校验</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        自动比对预览环境与生产环境的实际部署提交号。点击右上角 Publish 后，本页会持续轮询生产环境直到部署完成。
      </p>

      <section className="mt-8 border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl">提交号对比</h2>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="border border-foreground px-3 py-1.5 text-xs hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {isFetching ? "检查中…" : "重新检查"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-[var(--archive-pink)]">{(error as Error).message}</p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <EnvCard
            title="预览环境"
            origin={PREVIEW_ORIGIN}
            info={data?.preview}
          />
          <EnvCard
            title="生产环境"
            origin={PRODUCTION_ORIGIN}
            info={data?.production}
          />
        </div>

        <div className="mt-6 border-t border-border pt-6">
          {!data ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : data.match ? (
            <p className="text-sm">
              <span className="mr-2 inline-block rounded-sm bg-green-600 px-2 py-0.5 text-xs text-white">
                ✓ 一致
              </span>
              生产环境已部署到与预览相同的提交号 <code>{short(data.preview.commit)}</code>。
            </p>
          ) : (
            <p className="text-sm">
              <span className="mr-2 inline-block rounded-sm bg-[var(--archive-pink)] px-2 py-0.5 text-xs text-white">
                ✗ 不一致
              </span>
              预览为 <code>{short(data.preview.commit)}</code>，生产为{" "}
              <code>{short(data.production.commit)}</code>。请点击右上角 <strong>Publish</strong> 发布最新版本。
            </p>
          )}
        </div>
      </section>

      <PostPublishWatcher
        previewCommit={data?.preview.commit ?? null}
        productionCommit={data?.production.commit ?? null}
      />

      <section className="mt-8 border border-border bg-card p-6 text-xs text-muted-foreground">
        <div>当前页面运行的提交号：<code>{short(APP_COMMIT)}</code></div>
        <div className="mt-1">
          公共端点：
          <a href="/api/public/version" target="_blank" rel="noreferrer" className="underline">
            /api/public/version
          </a>
        </div>
        <div className="mt-3">
          <Link to="/admin" className="underline">← 返回概览</Link>
        </div>
      </section>
    </div>
  );
}

function EnvCard({
  title,
  origin,
  info,
}: {
  title: string;
  origin: string;
  info?: {
    ok: boolean;
    commit: string | null;
    builtAt: string | null;
    error?: string;
  };
}) {
  return (
    <div className="border border-border p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <div className="mt-1 break-all text-[11px] text-muted-foreground">{origin}</div>
      {!info ? (
        <div className="mt-3 text-sm text-muted-foreground">—</div>
      ) : info.ok ? (
        <>
          <div className="mt-3 font-mono text-lg">{short(info.commit)}</div>
          <div className="mt-1 text-xs text-muted-foreground">构建于 {fmt(info.builtAt)}</div>
        </>
      ) : (
        <div className="mt-3 text-sm text-[var(--archive-pink)]">
          无法获取：{info.error ?? "未知错误"}
        </div>
      )}
    </div>
  );
}

function PostPublishWatcher({
  previewCommit,
  productionCommit,
}: {
  previewCommit: string | null;
  productionCommit: string | null;
}) {
  const check = useServerFn(checkProductionCommit);
  const [watching, setWatching] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<{
    matches: boolean;
    commit: string | null;
    elapsedMs: number;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  const startWatch = () => {
    if (!previewCommit) return;
    setTarget(previewCommit);
    setResult(null);
    setWatching(true);
    setStartedAt(Date.now());
  };

  const stopWatch = () => {
    setWatching(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!watching || !target || !startedAt) return;
    let cancelled = false;

    const poll = async () => {
      const r = await check({ data: { targetCommit: target } });
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      if (r.matches) {
        setResult({ matches: true, commit: r.commit, elapsedMs: elapsed });
        setWatching(false);
        return;
      }
      if (elapsed > 5 * 60 * 1000) {
        setResult({ matches: false, commit: r.commit, elapsedMs: elapsed });
        setWatching(false);
        return;
      }
      timerRef.current = window.setTimeout(poll, 5000);
    };

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [watching, target, startedAt, check]);

  const stale = previewCommit && productionCommit && previewCommit !== productionCommit;

  return (
    <section className="mt-6 border border-border bg-card p-6">
      <h2 className="font-serif text-xl">发布后核对</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        点击右上角 Publish 后，再点击下方按钮，将每 5 秒轮询一次生产环境，直到生产返回预览的提交号（最长 5 分钟）。
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={startWatch}
          disabled={!previewCommit || watching}
          className="border border-foreground bg-foreground px-4 py-2 text-sm text-background hover:bg-accent disabled:opacity-50"
        >
          {watching ? "正在轮询…" : stale ? "开始等待生产部署" : "重新轮询确认"}
        </button>
        {watching ? (
          <button
            onClick={stopWatch}
            className="border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background"
          >
            停止
          </button>
        ) : null}
      </div>

      {target ? (
        <div className="mt-4 text-sm">
          目标提交号：<code>{short(target)}</code>
          {watching ? (
            <span className="ml-3 text-muted-foreground">
              已等待 {Math.round(((Date.now() - (startedAt ?? Date.now())) / 1000))}s …
            </span>
          ) : null}
        </div>
      ) : null}

      {result ? (
        result.matches ? (
          <div className="mt-4 text-sm">
            <span className="mr-2 inline-block rounded-sm bg-green-600 px-2 py-0.5 text-xs text-white">
              ✓ 已部署
            </span>
            生产已更新到 <code>{short(result.commit)}</code>，用时 {Math.round(result.elapsedMs / 1000)}s。
          </div>
        ) : (
          <div className="mt-4 text-sm">
            <span className="mr-2 inline-block rounded-sm bg-[var(--archive-pink)] px-2 py-0.5 text-xs text-white">
              ⏱ 超时
            </span>
            5 分钟内仍未检测到目标提交号（当前生产为 <code>{short(result.commit)}</code>）。请确认是否已点击 Publish。
          </div>
        )
      ) : null}
    </section>
  );
}
