import { useState, useRef, useEffect } from "react";
import styles from "../REDMS.module.css";

export function MobileHeaderActions({ children, label = "Menu" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className={styles["hdr-actions-wrap"]} ref={wrapRef}>
      <div className={styles["hdr-actions-desktop"]}>{children}</div>
      <div className={styles["hdr-actions-mobile"]}>
        <button
          type="button"
          className={styles["hdr-menu-btn"]}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {label}
        </button>
        {open && (
          <div className={styles["hdr-mobile-dropdown"]} role="menu">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
