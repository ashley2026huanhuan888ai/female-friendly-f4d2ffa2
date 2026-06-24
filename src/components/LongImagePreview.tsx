import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LongImagePreviewProps {
  src: string;
  alt?: string;
  /** 列表缩略图最大高度，默认 60vh */
  thumbnailMaxHeight?: string;
  /** 已知宽高比时传入（width / height），避免布局抖动 */
  aspectHint?: number;
  className?: string;
  onOpen?: () => void;
}

/**
 * 通用长图预览组件
 * - 列表态：宽度填满、按比例展示，超出 thumbnailMaxHeight 时仅显示顶部（顶对齐裁剪）
 * - 全屏态：宽度铺满，竖向滚动查看完整长图
 */
export function LongImagePreview({
  src,
  alt = "长图预览",
  thumbnailMaxHeight = "60vh",
  aspectHint,
  className,
  onOpen,
}: LongImagePreviewProps) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // 打开时锁 body 滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 打开后滚到顶部
  useEffect(() => {
    if (open && scrollerRef.current) {
      scrollerRef.current.scrollTop = 0;
      setProgress(0);
    }
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    onOpen?.();
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  const handleScroll = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollerRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1);
    });
  };

  return (
    <>
      {/* 缩略图态：顶对齐裁剪 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="点击查看完整长图"
        onClick={handleOpen}
        onKeyDown={handleKey}
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border border-border bg-muted",
          "cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          className,
        )}
        style={{
          maxHeight: thumbnailMaxHeight,
          aspectRatio: aspectHint ? String(aspectHint) : undefined,
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="block w-full h-auto select-none"
          draggable={false}
        />
        {/* 底部渐隐 + 提示条 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 pb-2 text-xs font-medium text-foreground/80">
          <ChevronDown className="h-3.5 w-3.5" />
          <span>点击查看完整长图</span>
        </div>
      </div>

      {/* 全屏态 */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* 顶部栏 + 进度 */}
          <div
            className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-background/85 px-3 backdrop-blur"
            style={{ paddingTop: "max(env(safe-area-inset-top), 8px)", paddingBottom: 8 }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent transition-[width] duration-75"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* 滚动容器 */}
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="h-full w-full overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="mx-auto"
              style={{
                paddingTop: "calc(max(env(safe-area-inset-top), 8px) + 48px)",
                paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
                maxWidth: "min(100vw, 720px)",
              }}
            >
              <img
                src={src}
                alt={alt}
                className="block w-full h-auto select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LongImagePreview;
