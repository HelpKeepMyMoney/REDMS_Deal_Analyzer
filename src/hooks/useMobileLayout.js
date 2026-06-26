import { useState, useEffect, useCallback } from "react";

const MOBILE_QUERY = "(max-width: 900px)";

export function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarCollapsed(true);
    };
    onChange(mq);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  return { isMobile, sidebarCollapsed, setSidebarCollapsed, toggleSidebar, closeSidebar };
}
