import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getMyProfile } from "@/lib/api/profile.functions";
import { getMyBoycottCount } from "@/lib/api/boycotts.functions";
import { renderProfileExportToPng } from "@/lib/exportProfileCanvas";

type Props = {
  open: boolean;
  onClose: () => void;
  tags: Array<{ tag: string; count: number }>;
};

const INK = "#1a1a1a";

export function ExportProfileDialog({ open, onClose, tags }: Props) {
  const { t, tag, language } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchBoycotts = useServerFn(getMyBoycottCount);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ dataUrl: string; blob: Blob; filename: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    let cancelled = false;

    (async () => {
      setGenerating(true);
      try {
        const [profile, bc] = await Promise.all([
          fetchProfile() as Promise<any>,
          fetchBoycotts().catch(() => ({ count: 0 })) as Promise<{ count: number }>,
        ]);
        const inviteCode = profile?.invite_code ?? "";
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const inviteUrl = `${origin}/login${inviteCode ? `?ref=${inviteCode}` : ""}`;
        const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
          margin: 1, width: 320, color: { dark: INK, light: "#ffffff" },
        }).catch(() => "");

        const dataUrl = await renderProfileExportToPng({
          nickname: profile?.display_name || (language === "zh" ? "匿名读者" : "Anonymous"),
          avatarUrl: profile?.avatar_url ?? null,
          inviteCode,
          points: Number(profile?.contribution_points ?? 0),
          level: Number(profile?.level ?? 1),
          levelTitle: profile?.level_title ?? (language === "zh" ? "萌新" : "Newcomer"),
          boycottCount: bc?.count ?? 0,
          tags,
          qrDataUrl,
          inviteUrl,
          i18n: {
            eyebrow: "MY OBSERVATORY",
            title: language === "zh" ? "个人观察台" : "My Observatory",
            pointsLabel: language === "zh" ? "贡献温度" : "Contribution",
            boycottLabel: language === "zh" ? "抵制次数" : "Spurns",
            levelLabel: language === "zh" ? "等级" : "Level",
            tagsTitle: language === "zh" ? "我观察的标签" : "Tags I observe",
            brandZh: language === "zh" ? "女性友好体验测评" : "Female Experience Assessment",
            brandEn: "FEMALE EXPERIENCE ASSESSMENT",
            scanHint: language === "zh" ? "扫码加入 · 我的邀请码" : "Scan to join · invite code",
            tagLabel: (tg: string) => tag(tg),
          },
        });
        if (cancelled) return;
        const blob = await (await fetch(dataUrl)).blob();
        const d = new Date();
        const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        const safe = (profile?.display_name || "observatory").replace(/[\\/:*?"<>|\s]+/g, "_");
        setResult({ dataUrl, blob, filename: `${safe}-observatory-${ymd}.png` });
      } catch (e: any) {
        if (!cancelled) toast.error(t("export.failed") + (e?.message ? `: ${e.message}` : ""));
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, tags, language, fetchProfile, fetchBoycotts, tag, t]);

  if (!open) return null;

  const isMobile =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleDownload = async () => {
    if (!result) return;
    if (isMobile) {
      const file = new File([result.blob], result.filename, { type: "image/png" });
      const nav: any = navigator;
      try {
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: language === "zh" ? "个人观察台" : "My Observatory" });
          return;
        }
      } catch {}
      toast.message(t("export.saveToAlbumHint"));
      return;
    }
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
        await nav.share({ files: [file], title: language === "zh" ? "个人观察台" : "My Observatory" });
        return;
      }
    } catch {}
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": result.blob })]);
        toast.success(t("export.shareUnsupported"));
      }
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="relative w-full max-w-xl bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-serif text-lg">
            {language === "zh" ? "导出我的观察台" : "Export My Observatory"}
          </h2>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          {generating && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("export.generating")}
            </p>
          )}
          {result && (
            <>
              {isMobile && (
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("export.saveToAlbumHint")}
                </p>
              )}
              <div className="max-h-[60vh] overflow-auto border border-border bg-background">
                <img src={result.dataUrl} alt="" className="block w-full" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
