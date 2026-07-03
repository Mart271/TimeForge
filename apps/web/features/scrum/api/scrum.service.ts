import { apiClient } from "@/lib/api/client";
import type { Page } from "@/features/time-tracking/api/time-entries.service";

export type ScrumTaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

export interface ScrumEntry {
  id: string;
  userId: string;
  entryDate: string;
  yesterday: string;
  today: string;
  blockers: string | null;
  notes: string | null;
  /** Self-reported task progress for the day, 0–100. */
  progress: number;
  status: ScrumTaskStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateScrumEntryPayload {
  entryDate: string;
  yesterday: string;
  today: string;
  blockers?: string;
  notes?: string;
  progress?: number;
  status?: ScrumTaskStatus;
}

export interface UpdateScrumEntryPayload {
  yesterday?: string;
  today?: string;
  blockers?: string;
  notes?: string;
  progress?: number;
  status?: ScrumTaskStatus;
  version: number;
}

export async function listScrumEntries(params: { from?: string; to?: string; limit?: number } = {}): Promise<Page<ScrumEntry>> {
  const { data } = await apiClient.get<Page<ScrumEntry>>("/scrum-entries", { params });
  return data;
}

export async function createScrumEntry(payload: CreateScrumEntryPayload): Promise<ScrumEntry> {
  const { data } = await apiClient.post<ScrumEntry>("/scrum-entries", payload);
  return data;
}

export async function updateScrumEntry(id: string, payload: UpdateScrumEntryPayload): Promise<ScrumEntry> {
  const { data } = await apiClient.patch<ScrumEntry>(`/scrum-entries/${id}`, payload);
  return data;
}
