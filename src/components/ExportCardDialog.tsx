import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";
import { getMyProfile } from "@/lib/api/profile.functions";
import { TempText } from "@/components/TempText";
import { bandOf } from "@/lib/temperature";

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

export function ExportCardDialog({ open, onClose, object, observations }: Props) {
  const { language, t, tag, objectType } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [configs, setConfigs] = useState<Record<string, ItemConfig>>({});
  const [nickname, setNickname] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [result, setResult] = useState<{ dataUrl: string; blob: Blob; filename: string } | null>(null);

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
    fetchProfile()
      .then((p: any) => setNickname(p?.display_name || ""))
      .catch(() => {});
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
    try {
      const urlsToCheck = orderedSelected
        .filter((o) => configs[o.id]?.includeScreenshot && o.screenshot_url)
        .map((o) => o.screenshot_url!);
      if (urlsToCheck.length) {
        const results = await Promise.all(
          urlsToCheck.map(
            (url) =>
              new Promise<boolean>((resolve) => {
                const probe = new Image();
                probe.crossOrigin = "anonymous";
                probe.onload = () => resolve(true);
                probe.onerror = () => resolve(false);
                probe.src = url;
              })
          )
        );
        if (results.some((ok) => !ok)) {
          toast.error(t("export.imageNotReady"));
          setGenerating(false);
          return;
        }
      }

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

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: PAPER,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const safeName = object.name.replace(/[\\/:*?"<>|\s]+/g, "_");
      const filename = `${safeName}-${ymd}-${orderedSelected.length}cards.png`;
      setResult({ dataUrl, blob, filename });
      toast.success(t("export.ready"));
    } catch (e: any) {
      console.error(e);
      toast.error(t("export.failed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
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
            onClick={onClose}
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
                  const hasShot = !!o.screenshot_url;
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
                          <label className={`flex items-center gap-2 text-xs ${!hasShot ? "opacity-50" : ""}`}>
                            <input
                              type="checkbox"
                              disabled={!hasShot}
                              checked={cfg.includeScreenshot && hasShot}
                              onChange={(e) =>
                                updateConfig(o.id, { includeScreenshot: e.target.checked })
                              }
                            />
                            {t("export.includeScreenshot")}
                            {!hasShot && (
                              <span className="text-muted-foreground">
                                ({t("export.noScreenshot")})
                              </span>
                            )}
                          </label>
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

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
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
                padding: "64px 64px 48px",
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <div style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 24, marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.04em" }}>
                      {t("export.cardTitle")}
                    </div>
                    <div style={{ fontSize: 15, color: MUTED, marginTop: 6 }}>
                      {t("export.cardSubtitle")}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
                    {t("export.archiveNo")}: {archiveNo}
                  </div>
                </div>
                <div style={{ marginTop: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", color: MUTED, marginBottom: 6 }}>
                      {objectType(object.type)}
                    </div>
                    <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.1 }}>{object.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, fontFamily: "ui-serif, Georgia, serif" }}>
                    <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: tempBand.color, fontVariantNumeric: "tabular-nums" }}>
                      {Math.round(object.temperature)}
                    </span>
                    <span style={{ fontSize: 22, color: MUTED }}>°C</span>
                  </div>
                </div>
              </div>

              {/* Sections per observation */}
              {orderedSelected.map((obs, idx) => {
                const cfg = configs[obs.id];
                if (!cfg) return null;
                const showShot = cfg.includeScreenshot && !!obs.screenshot_url;
                if (!showShot && !cfg.includeContent) return null;
                return (
                  <div key={obs.id} style={{ marginBottom: 44 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 16,
                        fontSize: 13,
                        color: MUTED,
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                      }}
                    >
                      <span>
                        № {String(idx + 1).padStart(2, "0")} / {String(orderedSelected.length).padStart(2, "0")}
                      </span>
                      <span>{formatDateForLanguage(obs.created_at, language)}</span>
                    </div>

                    {showShot && (
                      <div style={{ marginBottom: 22 }}>
                        <img
                          src={obs.screenshot_url!}
                          alt=""
                          crossOrigin="anonymous"
                          style={{
                            width: "100%",
                            maxHeight: 720,
                            objectFit: "contain",
                            display: "block",
                            border: `1px solid ${INK}`,
                            background: "#fff",
                          }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        border: `1px solid ${INK}`,
                        padding: "28px 32px",
                        background: "#fff",
                      }}
                    >
                      {/* Tag bar — 与详情页风格一致 */}
                      {(obs.evidence_level || cfg.tags.size > 0 || obs.scene) && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "8px 14px",
                            marginBottom: 16,
                            fontSize: 13,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            color: MUTED,
                          }}
                        >
                          {obs.evidence_level != null && (
                            <span style={{ border: `1px solid ${INK}`, color: INK, padding: "2px 8px" }}>
                              {t("common.evidence")} {obs.evidence_level}
                            </span>
                          )}
                          {Array.from(cfg.tags).map((tg) => (
                            <span key={tg} style={{ color: ACCENT, fontWeight: 600 }}>
                              #{tag(tg)}
                            </span>
                          ))}
                          {obs.scene && <span>· {obs.scene}</span>}
                        </div>
                      )}

                      {cfg.includeContent && (
                        <div>
                          {obs.summary && (
                            <div
                              style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, lineHeight: 1.5, color: INK }}
                            >
                              {obs.summary}
                            </div>
                          )}
                          <div style={{ fontSize: 19, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#2a2a2a" }}>
                            {obs.cleaned_content || obs.content}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* QR archive entry block */}
              {qrDataUrl && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "20px 24px",
                    border: `1px solid ${INK}`,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{ width: 140, height: 140, display: "block", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "inline-block", fontSize: 34, fontWeight: 700, borderBottom: `4px solid ${ACCENT}`, paddingBottom: 2, lineHeight: 1.15 }}>
                      {t("export.archiveEntry")}
                    </div>
                    <div style={{ fontSize: 17, color: MUTED, marginTop: 10 }}>
                      {t("export.scanToView")}
                    </div>
                  </div>
                  <div style={{ fontSize: 40, color: INK, paddingLeft: 8 }}>→</div>
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: `1px solid ${INK}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  color: MUTED,
                }}
              >
                <div>
                  {formatDateForLanguage(new Date().toISOString(), language)} ·{" "}
                  {t("export.exportedBy")}: <span style={{ fontWeight: 600, color: INK }}>{exporterName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>{archiveNo}</span>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{t("app.name")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
