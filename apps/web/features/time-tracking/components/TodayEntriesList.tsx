"use client";

import { useQuery } from "@tanstack/react-query";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { listProjects } from "../api/catalog.service";
import type { TimeEntry } from "../api/time-entries.service";
import { formatClockTime, formatMinutes, minutesBetween } from "@/lib/time";

interface TodayEntriesListProps {
  entries: TimeEntry[];
}

/** Today's logged sessions — read-only. Entries are recorded by the timer and cannot be deleted here. */
export function TodayEntriesList({ entries }: TodayEntriesListProps) {
  const { data: projects } = useQuery({ queryKey: ["catalog", "projects"], queryFn: listProjects });

  const projectName = (id: string | null) =>
    (id && projects?.find((p) => p.id === id)?.name) || "No project";

  return (
    <SectionCard title="Today's Entries">
      {entries.length === 0 ? (
        <EmptyState message="Nothing logged yet today — start the timer to begin your session." />
      ) : (
        <ul className="flex flex-col">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className={
                i === 0
                  ? "flex items-center gap-4 py-3"
                  : "flex items-center gap-4 border-t border-[#c3c6d2]/40 py-3"
              }
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-ink">
                  {projectName(entry.projectId)}
                </p>
                <p className="truncate text-xs text-brand-muted">
                  {entry.description || "No description"}
                </p>
              </div>
              <span className="hidden text-sm text-brand-muted sm:block">
                {formatClockTime(entry.startTime)}
                {" → "}
                {entry.endTime ? formatClockTime(entry.endTime) : "now"}
              </span>
              {entry.endTime ? (
                <StatusBadge
                  label={formatMinutes(
                    entry.durationMinutes ?? minutesBetween(entry.startTime, entry.endTime),
                  )}
                  tone="info"
                />
              ) : (
                <StatusBadge label="Running" tone="success" />
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
