import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/dash/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { datasetQuery } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { authDestination } from "@/lib/auth-navigation";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">تعذر تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          حاول مرة أخرى
        </button>
      </div>
    </div>
  );
}

function Pending() {
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <div className="text-center">
        <div className="mx-auto mb-3 size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        جاري تحميل البيانات من Google Sheets…
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "صناع الحياة سوهاج — نظام المتابعة" },
      { name: "description", content: "لوحة متابعة أنشطة ومتطوعي ومستهدفات صناع الحياة سوهاج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" },
    ],
  }),
  loader: ({ context, location }) => {
    if (location.pathname === "/auth" || location.pathname === "/reset-password") return null;
    return context.queryClient.ensureQueryData(datasetQuery());
  },
  pendingComponent: Pending,
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  // Prime the cache with the exact server snapshot so hydration reuses it instead
  // of fetching a newer copy of the sheets mid-render (which re-renders the tree).
  const seeded = Route.useLoaderData();
  const datasetKey = datasetQuery().queryKey;
  if (seeded && !queryClient.getQueryData(datasetKey)) {
    queryClient.setQueryData(datasetKey, seeded);
  }
  const path = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        queryClient.setQueryData(["password-recovery"], true);
        if (router.state.location.pathname !== "/reset-password") router.navigate({ to: "/reset-password", replace: true });
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("auth-return-to");
        void queryClient.cancelQueries();
        queryClient.removeQueries({ predicate: query => ["volunteers", "volunteer", "participations", "users", "audit"].includes(String(query.queryKey[0])) });
        queryClient.setQueryData(["me"], null);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
      if (event === "SIGNED_IN" && router.state.location.pathname === "/auth" && sessionStorage.getItem("auth-return-to")) {
        const destination = authDestination(sessionStorage.getItem("auth-return-to"));
        sessionStorage.removeItem("auth-return-to");
        router.navigate({ to: destination, replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {path === "/auth" || path === "/reset-password" ? <Outlet /> : <AppShell><Outlet /></AppShell>}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
