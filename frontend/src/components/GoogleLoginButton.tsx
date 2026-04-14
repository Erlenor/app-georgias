"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

// Declare google on the window object
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
          }) => {
            requestCode: (options?: { state?: string }) => void;
          };
        };
      };
    };
  }
}

export default function GoogleLoginButton() {
  const [error, setError] = useState("");
  const [oauthState, setOauthState] = useState("");
  const { login } = useAuth();
  
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    // Dynamically load the Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const bootstrapState = async () => {
      try {
        const stateRes = await fetch(`${API_URL}/api/auth/state`, {
          method: "GET",
          credentials: "include",
        });
        const stateData = await stateRes.json();
        if (!stateRes.ok || !stateData.state) {
          throw new Error("state_init_failed");
        }
        setOauthState(stateData.state);
      } catch {
        setError("Failed to initialize secure login state.");
      }
    };

    void bootstrapState();
  }, [API_URL]);

  const handleLoginClick = () => {
    setError("");
    
    if (!window.google) {
      setError("Google script not loaded yet. Please try again.");
      return;
    }
    if (!CLIENT_ID) {
      setError("Google Client ID is missing. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
      return;
    }

    if (!oauthState) {
      setError("Login is initializing. Please try again in a moment.");
      return;
    }

    const pendingState = oauthState;

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      redirect_uri: "postmessage",
      callback: async (response: { code?: string; error?: string }) => {
        if (response.error) {
          setError(`Google Auth Error: ${response.error}`);
          return;
        }
        if (!response.code) {
          setError("Google did not return an auth code.");
          return;
        }

        try {
          const res = await fetch(`${API_URL}/api/auth/google`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ auth_code: response.code, state: pendingState }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            await login();
          } else {
            setError(data.error || "Authentication failed. You might not have access.");
          }
        } catch (err) {
          setError("Failed to connect to the authentication server.");
        }
      },
    });

    client.requestCode({ state: pendingState });
  };

  return (
    <>
      {error && <div className="error-message">{error}</div>}
      <button onClick={handleLoginClick} className="google-btn">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" />
        Sign in with Google
      </button>
    </>
  );
}
