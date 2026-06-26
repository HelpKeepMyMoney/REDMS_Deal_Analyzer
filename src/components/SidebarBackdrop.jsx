import styles from "../REDMS.module.css";

export function SidebarBackdrop({ visible, onClose }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={styles["sidebar-backdrop"]}
      onClick={onClose}
      aria-label="Close inputs panel"
    />
  );
}
