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

type Props = {
  open: boolean;
  onClose: () => void;
  object: { id: string; name: string; type: string };
  observations: Observation[];
};

export function ExportCardDialog({ open, onClose, object, observations }: Props) {
  const { language, t, tag, objectType } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);

  const [selectedId, setSelectedId] = useState<string>("");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [nickname, setNickname] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => observations.find((o) => o.id === selectedId) || observations[0],
    [observations, selectedId]
  );

  useEffect(() => {
    if (open && observations.length && !selectedId) {
      setSelectedId(observations[0].id);
    }
  }, [open, observations, selectedId]);

  useEffect(() => {
    if (selected) {
      setSelectedTags(new Set(selected.tags || []));
    }
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    fetchProfile()
      .then((p: any) => setNickname(p?.display_name || ""))
      .catch(() => {});
  }, [open, fetchProfile]);

  if (!open) return null;

  const toggleTag = (tg: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tg)) next.delete(tg);
      else next.add(tg);
      return next;
    });
  };

  const handleExport = async () => {
    if (!cardRef.current || !selected) return;

    // Validate: at least one content section must be enabled
    if (!includeScreenshot && !includeContent) {
      toast.error(t("export.needContent"));
      return;
    }

    setGenerating(true);
    try {
      // Pre-check screenshot availability before rendering
      if (includeScreenshot && selected.screenshot_url) {
        const ok = await new Promise<boolean>((resolve) => {
          const probe = new Image();
          probe.crossOrigin = "anonymous";
          probe.onload = () => resolve(true);
          probe.onerror = () => resolve(false);
          probe.src = selected.screenshot_url!;
        });
        if (!ok) {
          toast.error(t("export.imageNotReady"));
          setGenerating(false);
          return;
        }
      }

      // wait for in-DOM images to settle
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
      a.download = `${object.name}-${selected.id.slice(0, 6)}.png`;
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
              <label className="mb-2 block text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("export.selectObservation")}
              </label>
              <select
                value={selected?.id ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-sm"
              >
                {observations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {formatDateForLanguage(o.created_at, language)} ·{" "}
                    {(o.summary || o.cleaned_content || o.content || "").slice(0, 40)}
                  </option>
                ))}
              </select>

              {selected && (
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeScreenshot}
                      onChange={(e) => setIncludeScreenshot(e.target.checked)}
                    />
                    {t("export.includeScreenshot")}
                    {!selected.screenshot_url && (
                      <span className="text-xs text-muted-foreground">
                        ({t("export.noScreenshot")})
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeContent}
                      onChange={(e) => setIncludeContent(e.target.checked)}
                    />
                    {t("export.includeContent")}
                  </label>

                  {(selected.tags?.length ?? 0) > 0 && (
                    <div>
                      <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {t("export.tags")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.tags!.map((tg) => (
                          <button
                            key={tg}
                            type="button"
                            onClick={() => toggleTag(tg)}
                            className={`border px-2 py-1 text-xs ${
                              selectedTags.has(tg)
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-foreground"
                            }`}
                          >
                            {selectedTags.has(tg) ? "☑ " : "☐ "} {tag(tg)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            disabled={!selected || generating}
            className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent disabled:opacity-50"
          >
            {generating ? t("export.generating") : t("export.generate")}
          </button>
        </div>

        {/* Off-screen render target */}
        {selected && (
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

              {/* Page 1: Screenshot */}
              {includeScreenshot && (
                <div style={{ marginBottom: 32 }}>
                  {selected.screenshot_url ? (
                    <img
                      src={selected.screenshot_url}
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
                        padding: "60px 0",
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

              {/* Page 2: Evidence + content */}
              <div
                style={{
                  border: "1px solid #1a1a1a",
                  padding: "28px 32px",
                  background: "#fff",
                }}
              >
                {selectedTags.size > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 12,
                        borderBottom: "1px solid #1a1a1a",
                        paddingBottom: 6,
                      }}
                    >
                      {t("export.evidenceLabel")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 24px" }}>
                      {Array.from(selectedTags).map((tg) => (
                        <div
                          key={tg}
                          style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}
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

                {includeContent && (
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginBottom: 12,
                        borderBottom: "1px solid #1a1a1a",
                        paddingBottom: 6,
                      }}
                    >
                      {t("export.observationLabel")}
                    </div>
                    {selected.summary && (
                      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>
                        {selected.summary}
                      </div>
                    )}
                    <div style={{ fontSize: 18, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {selected.cleaned_content || selected.content}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  marginTop: 28,
                  paddingTop: 16,
                  borderTop: "2px solid #1a1a1a",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "#444",
                }}
              >
                <div>
                  {formatDateForLanguage(selected.created_at, language)} · {t("export.exportedBy")}:{" "}
                  <span style={{ fontWeight: 600 }}>{exporterName}</span>
                </div>
                <div style={{ color: "#e91e63", fontWeight: 600 }}>
                  {t("app.name")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
