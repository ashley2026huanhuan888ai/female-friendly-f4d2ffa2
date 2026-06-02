import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export function LoginPrompt({
  title,
  body,
  redirect,
  buttonLabel = "登录并继续",
  inline = false,
}: {
  title: string;
  body: string;
  redirect: string;
  buttonLabel?: string;
  inline?: boolean;
}) {
  const card = (
    <div className="mx-auto max-w-xl border border-border bg-card p-8">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">需要登录</div>
      <h2 className="mt-3 font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      <Link
        to="/login"
        search={{ redirect }}
        className="mt-6 inline-block border border-foreground bg-foreground px-5 py-2.5 text-sm text-background hover:bg-accent hover:border-accent"
      >
        {buttonLabel}
      </Link>
    </div>
  );
  if (inline) return card;
  return (
    <SiteLayout>
      <div className="container-prose py-20">{card}</div>
    </SiteLayout>
  );
}
