"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getClassrooms } from "@/lib/api/classrooms";
import type { ClassGroup } from "@/lib/types";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassGroup[]>([]);

  useEffect(() => {
    getClassrooms().then(setClassrooms);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Classrooms</h2>
          <p className="text-sm text-muted mt-1">Manage classroom assignments and Droid mappings.</p>
        </div>
        <Link
          href="/register/class-group"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
        >
          <Plus size={15} />
          New Class Group
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map((room) => (
          <div key={room.id} className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <span className="text-xs text-muted bg-subtle border border-border px-2 py-0.5 rounded-full">
                {room.academicYear}
              </span>
            </div>
            <h3 className="font-semibold text-text mb-0.5">{room.name}</h3>
            <p className="text-sm text-muted mb-3">{room.room}</p>
            {room.droidId && (
              <span className="inline-flex items-center text-xs text-primary bg-primary-light px-2.5 py-1 rounded-full">
                🤖 {room.droidId}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
