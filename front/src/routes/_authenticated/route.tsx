import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let { data } = await supabase.auth.getUser();
    if (!data.user) {
      // Auto sign-in anonymously so all features work without an explicit login
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) throw anonErr;
      data = { user: anon.user } as any;
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});