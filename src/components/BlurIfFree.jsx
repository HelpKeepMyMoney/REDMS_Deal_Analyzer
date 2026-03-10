/**
 * Wraps content in a blur overlay when user is on Free tier.
 * Use for limiting visibility of premium features.
 */
import styles from "../REDMS.module.css";

export function BlurIfFree({ children, isFreeTier, className = "" }) {
  if (!isFreeTier) return children;
  return (
    <div className={`${styles.tierBlurWrap} ${className}`} style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
      {children}
    </div>
  );
}
