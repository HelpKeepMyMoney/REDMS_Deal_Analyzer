import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./AdminDropdown.module.css";

/**
 * Dropdown for wholesaler users (non-admin) to switch between Wholesaler and Investor modules.
 */
export function WholesalerModuleDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const isWholesaler = location.pathname.startsWith("/wholesaler");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const label = isWholesaler ? "Wholesaler" : "Investor";

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Switch module"
      >
        <span>{label}</span>
        <span className={styles.chevron} aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <Link
            to="/wholesaler"
            className={styles.item}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Wholesaler
          </Link>
          <Link
            to="/investor"
            className={styles.item}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Investor
          </Link>
        </div>
      )}
    </div>
  );
}
