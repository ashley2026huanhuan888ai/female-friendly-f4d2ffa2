import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";
import { getMyProfile } from "@/lib/api/profile.functions";

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
  object: { id: string; name: string; type: string };
  observations: Observation[];
};

export function ExportCardDialog({ open, onClose, object, observations }: Props) {
  const { language, t, tag, objectType } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [configs, setConfigs] = useState<Record<string, ItemConfig>>({});
  const [nickname, setNickname] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize on open
  useEffect(() => {
    if (!open || observations.length === 0) return;
    setSelectedIds((prev) => (prev.size ? prev : new Set([observations[0].id])));
    setConfigs((prev) => {
      const next = { ...prev };
      for (const o of observations) {
        if (!next[o.id]) {
          next[o.id] = {
            includeScreenshot: true,
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

  if (!open) return null;

  const orderedSelected = observations.filter((o) => selectedIds.has(o.id));

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
    if (orderedSelected.length === 0) {
      toast.error(t("export.empty"));
      return;
    }
    if (!hasAnyContent) {
      toast.error(t("export.needContent"));
      return;
    }

    setGenerating(true);
    try {
      // Pre-check all screenshot URLs in parallel
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
        backgroundColor: "#f5f1ea",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${object.name}-cards-${orderedSelected.length}.png`;
      a.click();
      toast.success(t("export.button"));
    } catch (e: any) {
      console.error(e);
      toast.error(t("export.failed"));
    } finally {
      setGenerating(false);
    }
  };

  const archiveNo = `FF-2026-${object.id.slice(0, 6).toUpperCase()}`;
  const exporterName = nickname || t("export.anonymous");
  const allSelected = selectedIds.size === observations.length && observations.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
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
                              checked={cfg.includeScreenshot}
                              onChange={(e) =>
                                updateConfig(o.id, { includeScreenshot: e.target.checked })
                              }
                            />
                            {t("export.includeScreenshot")}
                            {!o.screenshot_url && (
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
                                          ? "border-foreground bg-foreground text-background"
                                          : "border-border text-foreground"
                                      }`}
                                    >
                                      {on ? "☑ " : "☐ "} {tag(tg)}
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
                background: "#f5f1ea",
                color: "#1a1a1a",
                fontFamily: "ui-serif, Georgia, 'Songti SC', serif",
                padding: "56px 56px 40px",
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <div style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 20, marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "0.04em" }}>
                      {t("export.cardTitle")}
                    </div>
                    <div style={{ fontSize: 16, color: "#666", marginTop: 4 }}>
                      {t("export.cardSubtitle")}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: "#666", fontFamily: "ui-monospace, monospace" }}>
                    {t("export.archiveNo")}: {archiveNo}
                  </div>
                </div>
                <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 16 }}>
                  <div
                    style={{
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      color: "#999",
                    }}
                  >
                    {objectType(object.type)}
                  </div>
                  <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>{object.name}</div>
                </div>
              </div>

              {/* Sections per observation */}
              {orderedSelected.map((obs, idx) => {
                const cfg = configs[obs.id];
                if (!cfg) return null;
                return (
                  <div key={obs.id} style={{ marginBottom: 36 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 14,
                        fontSize: 13,
                        color: "#999",
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                      }}
                    >
                      <span>
                        № {String(idx + 1).padStart(2, "0")} / {String(orderedSelected.length).padStart(2, "0")}
                      </span>
                      <span>{formatDateForLanguage(obs.created_at, language)}</span>
                    </div>

                    {cfg.includeScreenshot && (
                      <div style={{ marginBottom: 20 }}>
                        {obs.screenshot_url ? (
                          <img
                            src={obs.screenshot_url}
                            alt=""
                            crossOrigin="anonymous"
                            style={{
                              width: "100%",
                              display: "block",
                              border: "1px solid #1a1a1a",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              border: "1px dashed #999",
                              padding: "48px 0",
                              textAlign: "center",
                              color: "#999",
                              fontSize: 18,
                            }}
                          >
                            {t("export.noScreenshot")}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        border: "1px solid #1a1a1a",
                        padding: "24px 28px",
                        background: "#fff",
                      }}
                    >
                      {cfg.tags.size > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              marginBottom: 10,
                              borderBottom: "1px solid #1a1a1a",
                              paddingBottom: 6,
                            }}
                          >
                            {t("export.evidenceLabel")}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
                            {Array.from(cfg.tags).map((tg) => (
                              <div
                                key={tg}
                                style={{ fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 18,
                                    height: 18,
                                    border: "2px solid #1a1a1a",
                                    textAlign: "center",
                                    lineHeight: "14px",
                                    fontSize: 14,
                                    color: "#e91e63",
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓
                                </span>
                                {tag(tg)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {cfg.includeContent && (
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              marginBottom: 10,
                              borderBottom: "1px solid #1a1a1a",
                              paddingBottom: 6,
                            }}
                          >
                            {t("export.observationLabel")}
                          </div>
                          {obs.summary && (
                            <div
                              style={{ fontSize: 21, fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}
                            >
                              {obs.summary}
                            </div>
                          )}
                          <div style={{ fontSize: 17, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {obs.cleaned_content || obs.content}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer */}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 16,
                  borderTop: "2px solid #1a1a1a",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "#444",
                }}
              >
                <div>
                  {formatDateForLanguage(new Date().toISOString(), language)} ·{" "}
                  {t("export.exportedBy")}: <span style={{ fontWeight: 600 }}>{exporterName}</span>
                </div>
                <div style={{ color: "#e91e63", fontWeight: 600 }}>{t("app.name")}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
