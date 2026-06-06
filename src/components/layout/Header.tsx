"use client";

import { useAuth } from "@/context/AuthContext";
import { Globe } from "lucide-react";
import Image from "next/image";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-text">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Language toggle */}
        <button className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors">
          <Globe size={16} />
          <span>EN / MS</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-sm font-medium text-text leading-tight">
              {user?.displayName ?? "Admin User"}
            </p>
            <p className="text-xs text-muted leading-tight">Super Admin</p>
          </div>
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName ?? "Avatar"}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
              {user?.displayName?.charAt(0) ?? "A"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
