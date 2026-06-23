import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const getActivationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("is_activated")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { isActivated: Boolean(data?.is_activated) };
  });

export const activateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("activate_account", {
      _password: data.password,
    });
    if (error) throw error;
    return { ok: Boolean(ok) };
  });

export const getActivationPassword = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("value")
      .eq("key", "activation_password")
      .maybeSingle();
    if (error) throw error;
    return { password: data?.value ?? "" };
  });

export const setActivationPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ password: z.string().min(4).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("app_settings")
      .upsert(
        { key: "activation_password", value: data.password, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw error;
    return { ok: true };
  });
