import type { ReactNode } from "react";

type AlertVariant = "error" | "warning" | "info" | "success";

const STYLES: Record<AlertVariant, { box: string; icon: string; label: string }> = {
  error: {
    box: "border-danger-600/40 bg-danger-100 text-red-900",
    icon: "✕",
    label: "Error",
  },
  warning: {
    box: "border-warning-600/40 bg-warning-100 text-amber-900",
    icon: "!",
    label: "Warning",
  },
  info: {
    box: "border-primary-300 bg-primary-50 text-primary-900",
    icon: "i",
    label: "Information",
  },
  success: {
    box: "border-success-600/40 bg-success-100 text-green-900",
    icon: "✓",
    label: "Success",
  },
};

/**
 * Accessible alert with role="alert" for errors (assertive) and
 * role="status" for informational updates. Errors always pair an icon,
 * text and actions — never color alone (AGENTS.md §20).
 */
export function Alert({
  variant = "info",
  title,
  children,
  actions,
  id,
}: {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  const styles = STYLES[variant];
  return (
    <div
      id={id}
      role={variant === "error" ? "alert" : "status"}
      className={`flex flex-col gap-2 rounded-lg border p-4 text-sm sm:flex-row sm:items-start sm:gap-3 ${styles.box}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-bold"
      >
        {styles.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="[&_a]:underline">{children}</div>
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
