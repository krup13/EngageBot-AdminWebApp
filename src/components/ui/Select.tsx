"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className = "", ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={`w-full appearance-none rounded-lg border px-3 py-2.5 pr-9 text-sm text-text bg-white transition-colors outline-none cursor-pointer
            ${error ? "border-error focus:ring-1 focus:ring-error" : "border-border focus:border-primary focus:ring-1 focus:ring-primary"}
            ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
});
