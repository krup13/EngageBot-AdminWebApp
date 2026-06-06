import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-4">
        <Settings size={32} className="text-primary" />
      </div>
      <h2 className="text-xl font-bold text-text mb-2">Settings</h2>
      <p className="text-sm text-muted max-w-xs">
        System configuration, admin user management, and school profile settings will be available here.
      </p>
    </div>
  );
}
