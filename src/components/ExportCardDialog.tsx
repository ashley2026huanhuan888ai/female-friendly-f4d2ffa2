import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";
import { getMyProfile } from "@/lib/api/profile.functions";
import { TempText } from "@/components/TempText";
import { bandOf } from "@/lib/temperature";
import { renderExportToPng } from "@/lib/exportCanvas";

type Observation = {
  id: string;
  content: string;
  cleaned_content?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  screenshot_url?: string | null;
  reference_url?: string | null;
  created_at: string;
  evidence_level?: number | null;
  scene?: string | null;
};

type ItemConfig = {
  includeScreenshot: boolean;
  includeContent: boolean;
  tags: Set<string>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  object: { id: string; name: string; type: string; temperature: number };
  observations: Observation[];
};

const ACCENT = "#e0218a";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const PAPER = "#f5f1ea";

// 导出安全 HEX（避免 oklch / CSS 变量进入 html-to-image）
const BAND_HEX: Record<string, string> = {
  comfort: "#4DA6B3",
  minor: "#A89F8A",
  notable: "#D89B5A",
  high: "#C95A3F",
  critical: "#8E2A1F",
};


export function ExportCardDialog({ open, onClose, object, observations }: Props) {
  const { language, t, tag, objectType } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [configs, setConfigs] = useState<Record<string, ItemConfig>>({});
  const [nickname, setNickname] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; label: string }>({ pct: 0, label: "" });
  const [shotBlobs, setShotBlobs] = useState<Record<string, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [result, setResult] = useState<{ dataUrl: string; blob: Blob; filename: string } | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || observations.length === 0) return;
    setSelectedIds((prev) => (prev.size ? prev : new Set([observations[0].id])));
    setConfigs((prev) => {
      const next = { ...prev };
      for (const o of observations) {
        if (!next[o.id]) {
          next[o.id] = {
            includeScreenshot: !!o.screenshot_url,
            includeContent: true,
            tags: new Set(o.tags || []),
          };
        }
      }
      return next;
    });
  }, [open, observations]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled || !data.session) return;
        fetchProfile()
          .then((p: any) => setNickname(p?.display_name || ""))
          .catch(() => {});
      })
    );
    return () => {
      cancelled = true;
    };
  }, [open, fetchProfile]);

  useEffect(() => {
    if (!open) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/objects/${object.id}`;
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: INK, light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [open, object.id]);

  const orderedSelected = useMemo(
    () => observations.filter((o) => selectedIds.has(o.id)),
    [observations, selectedIds]
  );

  if (!open) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(observations.map((o) => o.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const updateConfig = (id: string, patch: Partial<ItemConfig>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleTag = (id: string, tg: string) => {
    setConfigs((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const tags = new Set(cur.tags);
      if (tags.has(tg)) tags.delete(tg);
      else tags.add(tg);
      return { ...prev, [id]: { ...cur, tags } };
    });
  };

  const hasAnyContent = orderedSelected.some((o) => {
    const c = configs[o.id];
    return c && (c.includeContent || (c.includeScreenshot && o.screenshot_url));
  });
  const canGenerate = orderedSelected.length > 0 && hasAnyContent;

  const handleExport = async () => {
    if (!cardRef.current) return;
    if (orderedSelected.length === 0) return toast.error(t("export.empty"));
    if (!hasAnyContent) return toast.error(t("export.needContent"));

    setGenerating(true);
    setProgress({ pct: 5, label: t("export.progressPrepare") });
    const createdBlobUrls: string[] = [];
    const failedShotIds = new Set<string>();
    try {
      // 1) 预取截图为 blob URL
      const shotEntries = orderedSelected
        .filter((o) => o.screenshot_url && configs[o.id]?.includeScreenshot)
        .map((o) => [o.id, o.screenshot_url!] as const);
      if (shotEntries.length) {
        const fetched = await Promise.all(
          shotEntries.map(async ([id, url]) => {
            try {
              const r = await fetch(url, { mode: "cors", cache: "no-cache" });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const blob = await r.blob();
              const objUrl = URL.createObjectURL(blob);
              createdBlobUrls.push(objUrl);
              return [id, objUrl] as const;
            } catch (err) {
              console.warn("[ExportCard] screenshot fetch failed", url, err);
              failedShotIds.add(id);
              return [id, ""] as const;
            }
          })
        );
        const map: Record<string, string> = {};
        for (const [id, u] of fetched) if (u) map[id] = u;
        setShotBlobs(map);
        if (failedShotIds.size > 0) toast.warning(t("export.imageNotReady"));
      }
      setProgress({ pct: 30, label: t("export.progressImages") });

      // 2) 等离屏 <img> 解码完成（失败的截图已不会进入 DOM）
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const imgs = cardRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(imgs).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );
      setProgress({ pct: 50, label: t("export.progressRender") });
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      const dpr =
        typeof window !== "undefined" && window.devicePixelRatio
          ? window.devicePixelRatio
          : 2;
      const basePixelRatio = Math.min(2.5, Math.max(1.5, dpr));

      const MAX_ATTEMPTS = 3;
      let dataUrl = "";
      let lastErr: any = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const pr = attempt === 1 ? basePixelRatio : attempt === 2 ? Math.max(1, basePixelRatio - 0.5) : 1;
          dataUrl = await toPng(cardRef.current, {
            pixelRatio: pr,
            cacheBust: attempt > 1,
            skipFonts: true,
            backgroundColor: PAPER,
            filter: (node: HTMLElement) => {
              // 第二次起跳过所有 <img>，最大兼容
              if (attempt >= 2 && node.tagName === "IMG") return false;
              return true;
            },
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          console.warn(`[ExportCard] toPng attempt ${attempt}/${MAX_ATTEMPTS} failed`, err);
          if (attempt < MAX_ATTEMPTS) {
            setProgress({ pct: 50, label: t("export.progressRetry", { attempt: attempt + 1, total: MAX_ATTEMPTS }) });
            await new Promise((r) => setTimeout(r, 200 * attempt));
          }
        }
      }
      if (lastErr) {
        // 兜底：原生 Canvas 渲染
        console.warn("[ExportCard] toPng all attempts failed, falling back to native canvas", lastErr);
        setProgress({ pct: 70, label: t("export.progressRender") });
        const selectedObs = orderedSelected;
        const shotsForCanvas: Record<string, string> = {};
        for (const o of selectedObs) {
          if (shotBlobs[o.id]) shotsForCanvas[o.id] = shotBlobs[o.id];
        }
        dataUrl = await renderExportToPng({
          object,
          observations: selectedObs,
          configs: Object.fromEntries(
            selectedObs.map((o) => [o.id, configs[o.id]])
          ),
          shotBlobs: shotsForCanvas,
          qrDataUrl,
          bandHex: BAND_HEX[tempBand.band] || ACCENT,
          archiveNo,
          exporterName,
          i18n: {
            cardTitle: t("export.cardTitle"),
            cardSubtitle: t("export.cardSubtitle"),
            scanToView: t("export.scanToView"),
            exportedBy: t("export.exportedBy"),
            objectType: objectType(object.type),
            dateText: "{date}",
            nowText: formatDateForLanguage(new Date().toISOString(), language),
            tagLabel: (tg: string) => tag(tg),
          },
        });
        toast.success(t("export.fallbackUsed"));
      }

      setProgress({ pct: 85, label: t("export.progressEncode") });
      const blob = await (await fetch(dataUrl)).blob();
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const safeName = object.name.replace(/[\\/:*?"<>|\s]+/g, "_");
      const filename = `${safeName}-${ymd}-${orderedSelected.length}cards.png`;
      setProgress({ pct: 100, label: t("export.progressDone") });
      setResult({ dataUrl, blob, filename });
      toast.success(t("export.ready"));
    } catch (e: any) {
      console.error("[ExportCard] export failed entirely", e);
      const msg = e?.message ? `: ${String(e.message).slice(0, 120)}` : "";
      toast.error(t("export.failedFinal") + msg, {
        description: t("export.failedHint"),
        duration: 8000,
      });
    } finally {
      for (const u of createdBlobUrls) URL.revokeObjectURL(u);
      setShotBlobs({});
      setGenerating(false);
      setTimeout(() => setProgress({ pct: 0, label: "" }), 400);
    }
  };


  const isMobile =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleDownload = async () => {
    if (!result) return;
    // Mobile: try native share sheet first (iOS "Save Image" saves to album).
    if (isMobile) {
      const file = new File([result.blob], result.filename, { type: "image/png" });
      const nav: any = navigator;
      try {
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: object.name, text: t("export.cardTitle") });
          toast.success(t("export.openShareToSave"));
          return;
        }
      } catch {
        // user cancelled or share failed — fall through to long-press hint
      }
      toast.message(t("export.saveToAlbumHint"));
      return;
    }
    // Desktop: regular file download.
    const a = document.createElement("a");
    a.href = result.dataUrl;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    if (!result) return;
    const file = new File([result.blob], result.filename, { type: "image/png" });
    const nav: any = navigator;
    try {
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: object.name, text: t("export.cardTitle") });
        return;
      }
    } catch (e) {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": result.blob })]);
        toast.success(t("export.shareUnsupported"));
        return;
      }
    } catch {}
    toast.error(t("export.copyFailed"));
  };

  const copyFilename = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.filename);
      toast.success(t("export.filenameCopied"));
    } catch {}
  };

  const archiveNo = `FF-2026-${object.id.slice(0, 6).toUpperCase()}`;
  const exporterName = nickname || t("export.anonymous");
  const allSelected = selectedIds.size === observations.length && observations.length > 0;
  const tempBand = bandOf(object.temperature);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-serif text-lg">{t("export.title")}</h2>
          <button
            onClick={handleClose}
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {observations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("export.empty")}</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("export.selectObservation")} ({selectedIds.size}/{observations.length})
                </span>
                <button
                  type="button"
                  onClick={allSelected ? deselectAll : selectAll}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {allSelected ? t("export.deselectAll") : t("export.selectAll")}
                </button>
              </div>

              <div className="divide-y divide-border border border-border">
                {observations.map((o) => {
                  const checked = selectedIds.has(o.id);
                  const cfg = configs[o.id];
                  
                  return (
                    <div key={o.id} className="p-3">
                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(o.id)}
                          className="mt-1 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] text-muted-foreground">
                            {formatDateForLanguage(o.created_at, language)}
                          </span>
                          <span className="line-clamp-2 text-sm">
                            {o.summary || o.cleaned_content || o.content}
                          </span>
                        </span>
                      </label>

                      {checked && cfg && (
                        <div className="ml-6 mt-3 space-y-2 border-l-2 border-border pl-3">
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={cfg.includeContent}
                              onChange={(e) =>
                                updateConfig(o.id, { includeContent: e.target.checked })
                              }
                            />
                            {t("export.includeContent")}
                          </label>
                          {(o.tags?.length ?? 0) > 0 && (
                            <div>
                              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                {t("export.tags")}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {o.tags!.map((tg) => {
                                  const on = cfg.tags.has(tg);
                                  return (
                                    <button
                                      key={tg}
                                      type="button"
                                      onClick={() => toggleTag(o.id, tg)}
                                      className={`border px-2 py-0.5 text-[11px] ${
                                        on
                                          ? "border-accent bg-accent text-accent-foreground"
                                          : "border-border text-foreground"
                                      }`}
                                    >
                                      {on ? "☑ " : "☐ "} #{tag(tg)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {result && (
          <div className="border-t border-border bg-muted/30 px-5 py-4">
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("export.ready")} · {t("export.filename")}
                  </div>
                  <button
                    type="button"
                    onClick={copyFilename}
                    className="mt-1 block w-full truncate text-left font-mono text-xs text-foreground hover:text-accent"
                    title={result.filename}
                  >
                    {result.filename}
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                    className="border border-border px-2 py-1 text-xs hover:border-foreground"
                    aria-label="zoom out"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-mono text-[11px] text-muted-foreground">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                    className="border border-border px-2 py-1 text-xs hover:border-foreground"
                    aria-label="zoom in"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(1)}
                    className="ml-1 border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground"
                  >
                    1:1
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.05}
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                className="mb-3 w-full accent-accent"
                aria-label="preview zoom"
              />
              {isMobile && (
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("export.saveToAlbumHint")}
                </p>
              )}
              <div className="max-h-[60vh] overflow-auto border border-border bg-background">
                <img
                  src={result.dataUrl}
                  alt=""
                  style={{
                    width: `${previewZoom * 100}%`,
                    maxWidth: "none",
                    display: "block",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownload}
                className="border border-accent bg-accent px-4 py-2 text-xs uppercase tracking-wider text-accent-foreground hover:opacity-90"
              >
                {isMobile ? t("export.saveToAlbum") : t("export.download")}
              </button>
              <button
                onClick={handleShare}
                className="border border-foreground px-4 py-2 text-xs uppercase tracking-wider hover:bg-foreground hover:text-background"
              >
                {t("export.share")}
              </button>
              <button
                onClick={() => setResult(null)}
                className="ml-auto border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                {t("export.regenerate")}
              </button>
            </div>
          </div>
        )}

        {generating && (
          <div className="border-t border-border px-5 py-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{progress.label || t("export.generating")}</span>
              <span className="font-mono">{progress.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-muted">
              <div
                className="h-full bg-accent transition-[width] duration-200 ease-out"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={handleClose}
            className="border border-border px-4 py-2 text-xs uppercase tracking-wider hover:border-foreground"
          >
            ✕
          </button>
          <button
            onClick={handleExport}
            disabled={!canGenerate || generating}
            className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent disabled:opacity-50"
          >
            {generating
              ? t("export.generating")
              : `${t("export.generate")}${orderedSelected.length > 1 ? ` (${orderedSelected.length})` : ""}`}
          </button>
        </div>

        {/* Off-screen render target */}
        {orderedSelected.length > 0 && (
          <div
            style={{
              position: "fixed",
              left: "-10000px",
              top: 0,
              width: "1080px",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <div
              ref={cardRef}
              style={{
                width: "1080px",
                background: PAPER,
                color: INK,
                fontFamily: "ui-serif, Georgia, 'Songti SC', 'Noto Serif SC', serif",
                padding: "56px 64px 48px",
                boxSizing: "border-box",
              }}
            >
              {/* Masthead */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 36,
                  paddingBottom: 24,
                  borderBottom: `1px solid ${INK}20`,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span
                      style={{
                        background: ACCENT,
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        padding: "4px 12px",
                        fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      }}
                    >
                      {objectType(object.type)}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        textTransform: "uppercase",
                        letterSpacing: "0.24em",
                        color: MUTED,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {archiveNo}
                    </span>
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.1 }}>
                    {t("export.cardTitle")}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: MUTED,
                      marginTop: 8,
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontWeight: 300,
                    }}
                  >
                    {t("export.cardSubtitle")}
                  </div>
                </div>
                {qrDataUrl && (
                  <div style={{ flexShrink: 0, width: 160, textAlign: "right" }}>
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      style={{
                        width: 132,
                        height: 132,
                        display: "block",
                        marginLeft: "auto",
                        background: "#fff",
                        padding: 6,
                        border: `1px solid ${INK}20`,
                        boxSizing: "border-box",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        marginTop: 8,
                        lineHeight: 1.4,
                        fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      }}
                    >
                      {t("export.scanToView")}
                    </div>
                  </div>
                )}
              </div>

              {/* Object name + thermometer */}
              {(() => {
                const tempColor = BAND_HEX[tempBand.band] || ACCENT;
                const allTags = Array.from(
                  new Set(orderedSelected.flatMap((o) => Array.from(configs[o.id]?.tags || [])))
                );
                return (
                  <div style={{ padding: "40px 0 36px" }}>
                    <div
                      style={{
                        fontSize: object.name.length > 18 ? 56 : object.name.length > 10 ? 68 : 84,
                        fontWeight: 700,
                        lineHeight: 1.05,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        marginBottom: 24,
                      }}
                    >
                      {object.name}
                    </div>
                    {allTags.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px 18px",
                          marginBottom: 20,
                          fontSize: 22,
                          fontWeight: 600,
                          color: tempColor,
                        }}
                      >
                        {allTags.map((tg) => (
                          <span key={tg}>#{tag(tg)}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 10,
                          background: `${INK}10`,
                          borderRadius: 9999,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${Math.max(0, Math.min(100, object.temperature))}%`,
                            background: tempColor,
                            borderRadius: 9999,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 84,
                            fontWeight: 700,
                            lineHeight: 1,
                            color: tempColor,
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {Math.round(object.temperature)}
                        </span>
                        <span style={{ fontSize: 28, fontWeight: 700, color: INK }}>°C</span>
                      </div>
                    </div>
                  </div>
                );
              })()}


              {/* Observations */}
              <div style={{ borderTop: `1px solid ${INK}15` }}>
                {orderedSelected.map((obs, idx) => {
                  const cfg = configs[obs.id];
                  if (!cfg) return null;
                  const showShot = cfg.includeScreenshot && !!obs.screenshot_url;
                  if (!showShot && !cfg.includeContent) return null;
                  return (
                    <div
                      key={obs.id}
                      style={{
                        display: "flex",
                        gap: 28,
                        paddingTop: 36,
                        paddingBottom: 36,
                        borderBottom: `1px solid ${INK}10`,
                      }}
                    >


                      <div style={{ flex: 1, minWidth: 0 }}>
                        {(cfg.tags.size > 0 || obs.scene) && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: "8px 16px",
                              marginBottom: 16,
                              fontSize: 18,
                              fontWeight: 600,
                            }}
                          >
                            {Array.from(cfg.tags).map((tg) => (
                              <span key={tg} style={{ color: ACCENT }}>
                                #{tag(tg)}
                              </span>
                            ))}
                            {obs.scene && (
                              <span
                                style={{
                                  color: MUTED,
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.12em",
                                  fontSize: 14,
                                }}
                              >
                                · {obs.scene}
                              </span>
                            )}
                          </div>
                        )}

                        {cfg.includeContent && (
                          <>
                            {obs.summary && (
                              <div
                                style={{
                                  fontSize: 32,
                                  fontWeight: 700,
                                  lineHeight: 1.4,
                                  marginBottom: 16,
                                  color: INK,
                                }}
                              >
                                {obs.summary}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 24,
                                lineHeight: 1.8,
                                whiteSpace: "pre-wrap",
                                color: "#2a2a2a",
                              }}
                            >
                              {obs.cleaned_content || obs.content}
                            </div>
                          </>
                        )}

                        {showShot && shotBlobs[obs.id] && (
                          <div style={{ marginTop: 22 }}>
                            <img
                              src={shotBlobs[obs.id]}
                              alt=""
                              style={{
                                width: "100%",
                                maxHeight: 640,
                                objectFit: "contain",
                                display: "block",
                                background: "#fff",
                                border: `1px solid ${INK}15`,
                              }}
                            />
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 16,
                            fontSize: 13,
                            color: MUTED,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            fontFamily: "ui-sans-serif, system-ui, sans-serif",
                          }}
                        >
                          {formatDateForLanguage(obs.created_at, language)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                style={{
                  marginTop: 28,
                  paddingTop: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                  color: MUTED,
                  letterSpacing: "0.06em",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                <div>
                  {formatDateForLanguage(new Date().toISOString(), language)}
                  <span style={{ opacity: 0.4, margin: "0 12px" }}>|</span>
                  {t("export.exportedBy")}: <span style={{ fontWeight: 600, color: INK }}>{exporterName}</span>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: INK,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    maxWidth: 360,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {object.name}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
