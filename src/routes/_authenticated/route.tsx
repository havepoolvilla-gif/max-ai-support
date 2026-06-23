import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ActivationGate } from "@/components/activation-gate";
import { SupportChatWidget } from "@/components/support-chat-widget";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideWidget = pathname.startsWith("/admin");
  return (
    <ActivationGate>
      <Outlet />
      {!hideWidget && <SupportChatWidget />}
    </ActivationGate>
  );
}
