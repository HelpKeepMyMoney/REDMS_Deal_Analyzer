import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminDropdown.module.css";

/**
 * Dropdown menu for admin users, shown under their email.
 * Links: Admin page, Investor module, Wholesaler module.
 */
export function AdminDropdown({ email, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  return (
    <div ref={ref} className={`${styles.wrap} ${className ?? ""}`}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Admin menu"
        title={email}
      >
        <span className={styles.email}>{email ?? ""}</span>
        <span className={styles.chevron} aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <Link
            to="/admin"
            className={styles.item}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Admin
          </Link>
          <Link
            to="/investor"
            className={styles.item}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Investor
          </Link>
          <Link
            to="/wholesaler"
            className={styles.item}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Wholesaler
          </Link>
          <Link
            to="/profile"
            className={styles.item}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
        </div>
      )}
    </div>
  );
}
