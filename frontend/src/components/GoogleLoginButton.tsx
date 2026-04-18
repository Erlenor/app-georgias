"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAuthState, exchangeGoogleCode } from "@/lib/api";

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id?: string;
            scope: string;
            ux_mode: "popup";
            redirect_uri?: string;
            callback: (response: { code?: string; error?: string }) => void;
          }) => { requestCode: (options?: { state?: string }) => void };
        };
      };
    };
  }
}

export default function GoogleLoginButton() {
  const [error, setError] = useState("");
  const [oauthState, setOauthState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getAuthState();
        setOauthState(data.state);
      } catch {
        setError("Failed to initialise login.");
      }
    })();
  }, []);

  function handleLogin() {
    setError("");
    if (!window.google) { setError("Google script not loaded yet. Try again."); return; }
    if (!CLIENT_ID) { setError("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID."); return; }
    if (!oauthState) { setError("Login initialising — try again in a moment."); return; }

    const pendingState = oauthState;
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      redirect_uri: "postmessage",
      callback: async (response) => {
        if (response.error || !response.code) {
          setError(`Google Auth Error: ${response.error ?? "unknown"}`);
          return;
        }
        setIsLoading(true);
        try {
          const data = await exchangeGoogleCode(response.code, pendingState);
          if (data.success) {
            await login();
          } else {
            setError(String(data.error) || "Authentication failed. You may not have access.");
          }
        } catch {
          setError("Could not connect to the authentication server.");
        } finally {
          setIsLoading(false);
        }
      },
    });
    client.requestCode({ state: pendingState });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-800 font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        )}
        {isLoading ? "Signing in..." : "Sign in with Google"}
      </button>
    </div>
  );
}
