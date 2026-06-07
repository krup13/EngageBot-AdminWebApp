"use client";

interface Tab {
  label: string;
  value: string;
}

interface TabToggleProps {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
}

export function TabToggle({ tabs, active, onChange }: TabToggleProps) {
  return (
    <div className="inline-flex items-center bg-subtle rounded-lg p-1 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
            active === tab.value
              ? "bg-surface text-text shadow-sm"
              : "text-muted hover:text-text"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
