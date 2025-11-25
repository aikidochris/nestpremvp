"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function handleCallback() {
      // Supabase magic links put tokens in the hash fragment, not the query string
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;

      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      console.log("[AuthCallback] hash params", {
        access_token: !!access_token,
        refresh_token: !!refresh_token,
      });

      if (!access_token || !refresh_token) {
        console.error("[AuthCallback] Missing tokens in URL");
        router.replace("/auth/login");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error("[AuthCallback] Error setting session", error);
        router.replace("/auth/login");
        return;
      }

      console.log("[AuthCallback] Session set successfully");

      const redirectTo = searchParams.get("redirect") ?? "/";
      router.replace(redirectTo);
    }

    handleCallback();
  }, [router, searchParams, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="bg-white border border-stone-200 rounded-2xl px-6 py-4 shadow-sm text-sm text-stone-700">
        Signing you in…
      </div>
    </div>
  );
}