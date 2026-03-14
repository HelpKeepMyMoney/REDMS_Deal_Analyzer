import { createContext, useContext, useEffect, useState } from "react";
import { loadAppConfig } from "../logic/configStorage.js";
import { mergeConfig } from "../logic/configParams.js";
import { loadUserConfig } from "../logic/userConfigStorage.js";
import { useAuth } from "./AuthContext.jsx";
import { useTierOptional } from "./TierContext.jsx";

const ConfigContext = createContext(null);

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}

function applyUserOverrides(appConfig, userOverrides) {
  if (!userOverrides || typeof userOverrides !== "object") return appConfig;
  const out = { ...appConfig };
  for (const [k, v] of Object.entries(userOverrides)) {
    if (v != null && typeof v === "number" && !isNaN(v)) {
      out[k] = v;
    }
  }
  return out;
}

export function ConfigProvider({ children }) {
  const { user } = useAuth();
  const tierCtx = useTierOptional();
  const dealParamsLevel = tierCtx?.dealParamsLevel ?? null;
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only load from Firestore when user is authenticated (rules require request.auth != null)
      const appC = user?.uid ? await loadAppConfig() : mergeConfig(null);
      if (cancelled) return;
      let merged = appC;
      if (user?.uid && (dealParamsLevel === "full" || dealParamsLevel === "limited")) {
        const userOverrides = await loadUserConfig(user.uid);
        if (!cancelled && userOverrides) {
          merged = applyUserOverrides(appC, userOverrides);
        }
      }
      if (!cancelled) {
        setConfig(merged);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.uid, dealParamsLevel]);

  const refreshConfig = async () => {
    const appC = await loadAppConfig();
    let merged = appC;
    if (user?.uid && (dealParamsLevel === "full" || dealParamsLevel === "limited")) {
      const userOverrides = await loadUserConfig(user.uid);
      if (userOverrides) {
        merged = applyUserOverrides(appC, userOverrides);
      }
    }
    setConfig(merged);
    return merged;
  };

  const value = {
    config: config ?? mergeConfig(null),
    loading,
    refreshConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}
