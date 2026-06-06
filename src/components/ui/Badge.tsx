interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "error" | "neutral" | "info" | "live";
  className?: string;
}

const variantClasses = {
  success: "bg-success-bg text-success border border-green-200",
  warning: "bg-warning-bg text-warning border border-yellow-200",
  error: "bg-error-bg text-error border border-red-200",
  neutral: "bg-gray-100 text-gray-600 border border-gray-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  live: "bg-green-600 text-white",
};

export function Badge({ label, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    ongoing: { label: "Ongoing", variant: "live" },
    scheduled: { label: "Scheduled", variant: "neutral" },
    completed: { label: "Completed", variant: "success" },
    active: { label: "Active", variant: "success" },
    inactive: { label: "Inactive", variant: "neutral" },
    offline: { label: "Offline", variant: "error" },
    pending: { label: "Pending", variant: "warning" },
    verified: { label: "Verified", variant: "success" },
    error: { label: "Error", variant: "error" },
    in_progress: { label: "In Progress", variant: "info" },
  };
  const config = map[status.toLowerCase()] ?? { label: status, variant: "neutral" as const };
  return <Badge label={config.label} variant={config.variant} />;
}
