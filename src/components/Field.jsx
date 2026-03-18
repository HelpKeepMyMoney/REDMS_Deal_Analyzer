import { useId } from "react";

/**
 * Form field with label. Supports number (with optional clamp) and text.
 * Optional error message and aria-invalid for accessibility.
 */
export function Field({
  label,
  name,
  value,
  onChange,
  type = "number",
  step = "1",
  error = null,
  id: idProp,
  rows = 4,
  placeholder,
  disabled = false,
  onFocus,
  onBlur,
}) {
  const fallbackId = useId();
  const id = idProp ?? `redms-field-${name}-${fallbackId.replace(/:/g, "")}`;
  const isTextarea = type === "textarea";

  const handleChange = (e) => {
    const raw = e.target.value;
    if (type === "number") {
      if (raw === "") {
        onChange(name, undefined);
      } else {
        const v = parseFloat(raw);
        onChange(name, Number.isFinite(v) ? v : 0);
      }
    } else {
      onChange(name, raw);
    }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isTextarea ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          type={type}
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
