import a1 from "@/assets/avatars/avatar-01.png";
import a2 from "@/assets/avatars/avatar-02.png";
import a3 from "@/assets/avatars/avatar-03.png";
import a4 from "@/assets/avatars/avatar-04.png";
import a5 from "@/assets/avatars/avatar-05.png";
import a6 from "@/assets/avatars/avatar-06.png";
import a7 from "@/assets/avatars/avatar-07.png";
import a8 from "@/assets/avatars/avatar-08.png";
import a9 from "@/assets/avatars/avatar-09.png";
import a10 from "@/assets/avatars/avatar-10.png";
import a11 from "@/assets/avatars/avatar-11.png";
import a12 from "@/assets/avatars/avatar-12.png";

export const PRESET_AVATARS: string[] = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12];

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

export function AvatarPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="不使用头像"
        aria-pressed={!value}
        className={`relative aspect-square overflow-hidden rounded-full border bg-muted/40 transition ${
          !value ? "border-accent ring-2 ring-accent" : "border-border hover:border-foreground"
        }`}
      >
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
          无
        </span>
      </button>
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
  );
}
