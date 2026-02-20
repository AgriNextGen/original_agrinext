import React from "react";
import { getRecentAccounts, RecentAccount } from "@/lib/localStorageRecentAccounts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function AccountSwitcher() {
  const accounts = getRecentAccounts();

  const useAccount = async (email: string) => {
    // Trigger Google OAuth with select_account to choose the exact account
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const addAnother = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Switch Google Account</h2>
      {accounts.length === 0 && <p className="text-sm text-muted-foreground">No recent accounts</p>}
      {accounts.map((a: RecentAccount) => (
        <div key={a.email} className="flex items-center justify-between p-2 border rounded mb-2">
          <div className="flex items-center gap-3">
            <img src={a.avatarUrl || "/avatar-placeholder.png"} alt="" className="w-8 h-8 rounded-full" />
            <div>
              <div className="font-medium">{a.email}</div>
              <div className="text-xs text-muted-foreground">{new Date(a.lastUsedAt).toLocaleString()}</div>
            </div>
          </div>
          <Button size="sm" onClick={() => useAccount(a.email)}>Use this account</Button>
        </div>
      ))}
      <div className="mt-4">
        <Button onClick={addAnother}>Add another Google account</Button>
      </div>
    </div>
  );
}

