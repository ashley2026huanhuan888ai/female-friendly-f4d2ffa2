import a1 from "@/assets/avatars/avatar-01.png.asset.json";
import a2 from "@/assets/avatars/avatar-02.png.asset.json";
import a3 from "@/assets/avatars/avatar-03.png.asset.json";
import a4 from "@/assets/avatars/avatar-04.png.asset.json";
import a5 from "@/assets/avatars/avatar-05.png.asset.json";
import a6 from "@/assets/avatars/avatar-06.png.asset.json";
import a7 from "@/assets/avatars/avatar-07.png.asset.json";
import a8 from "@/assets/avatars/avatar-08.png.asset.json";
import a9 from "@/assets/avatars/avatar-09.png.asset.json";
import a10 from "@/assets/avatars/avatar-10.png.asset.json";
import a11 from "@/assets/avatars/avatar-11.png.asset.json";
import a12 from "@/assets/avatars/avatar-12.png.asset.json";

export const PRESET_AVATARS: string[] = [
  a1.url, a2.url, a3.url, a4.url, a5.url, a6.url,
  a7.url, a8.url, a9.url, a10.url, a11.url, a12.url,
];

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  displayName?: string;
};

function initialsOf(name?: string) {
  const n = (name ?? "").trim();
  if (!n) return "?";
  return Array.from(n)[0]!.toUpperCase();
}

export function AvatarPicker({ value, onChange, displayName }: Props) {
  const selectedIndex = value ? PRESET_AVATARS.indexOf(value) : -1;
  const isNone = !value;

  return (
    <div className="grid gap-4">
      {/* Live preview */}
      <div className="flex items-center gap-4 border border-border bg-background p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-2xl text-muted-foreground">
              {initialsOf(displayName)}
            </div>
          )}
        </div>
        <div className="min-w-0 text-xs">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            实时预览
          </div>
          <div className="mt-1 text-sm text-foreground">
            {isNone
              ? "无头像"
              : selectedIndex >= 0
                ? `头像 ${String(selectedIndex + 1).padStart(2, "0")}`
                : "自定义头像"}
          </div>
          <p className="mt-1 text-muted-foreground">
            {isNone
              ? "将以你的昵称首字母作为占位显示。"
              : "已选中以下头像，保存后立即生效。"}
          </p>
        </div>
      </div>

      {/* No-avatar option */}
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={isNone}
        className={`flex items-center gap-3 border px-3 py-2 text-left text-xs transition ${
          isNone
            ? "border-accent ring-1 ring-accent bg-accent/5"
            : "border-border hover:border-foreground"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-[10px] text-muted-foreground">
          无
        </span>
        <span className="grid">
          <span className="text-foreground">不使用头像</span>
          <span className="text-muted-foreground">显示昵称首字母占位</span>
        </span>
        {isNone ? (
          <span className="ml-auto text-accent" aria-hidden>
            ✓
          </span>
        ) : null}
      </button>

      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {PRESET_AVATARS.map((url, i) => {
          const selected = value === url;
          return (
            <button
              key={url}
              type="button"
              onClick={() => onChange(url)}
              aria-label={`选择头像 ${i + 1}`}
              aria-pressed={selected}
              className={`relative aspect-square overflow-hidden rounded-full border bg-background transition ${
                selected
                  ? "border-accent ring-2 ring-accent"
                  : "border-border hover:border-foreground"
              }`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                width={512}
                height={512}
                className="h-full w-full object-cover"
              />
              {selected ? (
                <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] leading-none text-accent-foreground">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
