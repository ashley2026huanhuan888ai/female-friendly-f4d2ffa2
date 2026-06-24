import i1 from "@/assets/avatars/avatar-01.png.asset.json";
import i2 from "@/assets/avatars/avatar-02.png.asset.json";
import i3 from "@/assets/avatars/avatar-03.png.asset.json";
import i4 from "@/assets/avatars/avatar-04.png.asset.json";
import i5 from "@/assets/avatars/avatar-05.png.asset.json";
import i6 from "@/assets/avatars/avatar-06.png.asset.json";
import g1 from "@/assets/avatars/geom-01.png.asset.json";
import g2 from "@/assets/avatars/geom-02.png.asset.json";
import g3 from "@/assets/avatars/geom-03.png.asset.json";
import g4 from "@/assets/avatars/geom-04.png.asset.json";
import g5 from "@/assets/avatars/geom-05.png.asset.json";
import g6 from "@/assets/avatars/geom-06.png.asset.json";
import a1 from "@/assets/avatars/animal-01.png.asset.json";
import a2 from "@/assets/avatars/animal-02.png.asset.json";
import a3 from "@/assets/avatars/animal-03.png.asset.json";
import a4 from "@/assets/avatars/animal-04.png.asset.json";
import a5 from "@/assets/avatars/animal-05.png.asset.json";
import a6 from "@/assets/avatars/animal-06.png.asset.json";

type Group = { key: string; label: string; urls: string[] };

const AVATAR_GROUPS: Group[] = [
  {
    key: "illustration",
    label: "插画 · Illustration",
    urls: [i1.url, i2.url, i3.url, i4.url, i5.url, i6.url],
  },
  {
    key: "geometric",
    label: "几何 · Geometric",
    urls: [g1.url, g2.url, g3.url, g4.url, g5.url, g6.url],
  },
  {
    key: "animal",
    label: "动物 · Animal",
    urls: [a1.url, a2.url, a3.url, a4.url, a5.url, a6.url],
  },
];

export const PRESET_AVATARS: string[] = AVATAR_GROUPS.flatMap((g) => g.urls);

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

function findSelectedLabel(value: string | null): string {
  if (!value) return "无头像";
  for (const g of AVATAR_GROUPS) {
    const idx = g.urls.indexOf(value);
    if (idx >= 0) return `${g.label} · ${String(idx + 1).padStart(2, "0")}`;
  }
  return "自定义头像";
}

export function AvatarPicker({ value, onChange, displayName }: Props) {
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
          <div className="mt-1 text-sm text-foreground">{findSelectedLabel(value)}</div>
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

      {/* Grouped preset grids */}
      {AVATAR_GROUPS.map((group) => (
        <div key={group.key} className="grid gap-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {group.label}
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {group.urls.map((url, i) => {
              const selected = value === url;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => onChange(url)}
                  aria-label={`选择${group.label} ${i + 1}`}
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
      ))}
    </div>
  );
}
