"use client";

import { AlertTriangle, AlertCircle, CheckCircle2, X } from "lucide-react";

type AlertVariant = "error" | "warning" | "success" | "info";

interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  actions?: React.ReactNode;
}

const config: Record<AlertVariant, { bg: string; border: string; text: string; Icon: typeof AlertCircle }> = {
  error: { bg: "bg-error-bg", border: "border-error-border", text: "text-error", Icon: AlertCircle },
  warning: { bg: "bg-warning-bg", border: "border-warning-border", text: "text-warning", Icon: AlertTriangle },
  success: { bg: "bg-success-bg", border: "border-green-300", text: "text-success", Icon: CheckCircle2 },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", Icon: AlertCircle },
};

export function AlertBanner({ variant = "error", title, message, onDismiss, actions }: AlertBannerProps) {
  const { bg, border, text, Icon } = config[variant];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${bg} ${border}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${text}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${text}`}>{title}</p>}
        <p className={`text-sm ${text} ${title ? "mt-0.5" : ""}`}>{message}</p>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 ${text} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
