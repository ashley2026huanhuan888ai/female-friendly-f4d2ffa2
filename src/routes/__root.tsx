import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { APP_BUILT_AT, APP_COMMIT } from "@/lib/build-info";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BackToHome } from "@/components/BackToHome";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider, useI18n } from "@/lib/i18n";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">404</div>
        <h1 className="mt-4 font-serif text-4xl">{t("common.pageNotFound")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("common.pageNotFoundBody")}</p>
        <div className="mt-6 flex justify-center">
          <BackToHome />
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl">{t("submit.failedTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background"
        >
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "女性友好测评" },
      {
        name: "description",
        content:
          "基于用户观察与 AI 分析的女性友好体验观察平台。不进行法律意义上的事实认定，不进行道德审判。",
      },
      { property: "og:title", content: "女性友好测评" },
      { name: "twitter:title", content: "女性友好测评" },
      {
        property: "og:description",
        content:
          "基于用户观察与 AI 分析的女性友好体验观察平台。不进行法律意义上的事实认定，不进行道德审判。",
      },
      {
        name: "twitter:description",
        content:
          "基于用户观察与 AI 分析的女性友好体验观察平台。不进行法律意义上的事实认定，不进行道德审判。",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76304c01-5feb-48be-b366-e72692f2087b/id-preview-aa932e1d--521cf5fe-4250-44d0-8d80-2645e28c5002.lovable.app-1780306144641.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76304c01-5feb-48be-b366-e72692f2087b/id-preview-aa932e1d--521cf5fe-4250-44d0-8d80-2645e28c5002.lovable.app-1780306144641.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "google-site-verification", content: "L551CW5rBlsTsiBwNEF2UUVMlf1FyA6yNOaXqI_9oeQ" },
      { name: "app-commit", content: APP_COMMIT },
      { name: "app-built-at", content: APP_BUILT_AT },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Noto+Serif+SC:wght@500;700&family=Noto+Sans+SC:wght@400;500&display=swap",
        fetchpriority: "high",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
