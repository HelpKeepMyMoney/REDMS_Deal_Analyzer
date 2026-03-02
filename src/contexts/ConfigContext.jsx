import { createContext, useContext, useEffect, useState } from "react";
import { loadAppConfig } from "../logic/configStorage.js";
import { mergeConfig } from "../logic/configParams.js";

const ConfigContext = createContext(null);

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAppConfig().then((c) => {
      if (!cancelled) {
        setConfig(c);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const refreshConfig = async () => {
    const c = await loadAppConfig();
    setConfig(c);
    return c;
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
