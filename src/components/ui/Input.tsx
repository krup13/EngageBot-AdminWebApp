"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

type InputIcon = "mail" | "lock";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: InputIcon;
}

const iconMap = { mail: Mail, lock: Lock };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, type = "text", className = "", ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const Icon = icon ? iconMap[icon] : null;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          type={isPassword && showPassword ? "text" : type}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text placeholder:text-muted bg-white transition-colors outline-none
            ${error ? "border-error focus:ring-1 focus:ring-error" : "border-border focus:border-primary focus:ring-1 focus:ring-primary"}
            ${Icon ? "pl-9" : ""}
            ${isPassword ? "pr-10" : ""}
            ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
});
