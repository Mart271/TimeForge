"use client";

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Loader2, Lock, PencilLine, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { StatusBadge, type BadgeTone } from "@/components/shared/StatusBadge";
import { FieldLabel } from "@/features/auth/components/fields";
import { FieldError, FormBanner } from "@/features/auth/components/FormMessages";
import type { ToastState } from "@/components/shared/Toast";
import {
  createScrumEntry,
  updateScrumEntry,
  type ScrumEntry,
  type ScrumTaskStatus,
} from "@/features/scrum/api/scrum.service";
import { listProjects } from "../api/catalog.service";
import { dailyScrumSchema, type DailyScrumValues } from "../schemas/time-entry.schema";
import type { WorkTask } from "../lib/task-select";
import { formatClockTime, formatMinutes, toIsoDate } from "@/lib/time";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export interface ScrumTaskItem {
  id: string;
  title: string;
  status: ScrumTaskStatus;
  completedAt?: string | null;
}

export function parseTasks(todayStr: string | null | undefined): ScrumTaskItem[] {
  if (!todayStr) return [];
  try {
    const parsed = JSON.parse(todayStr);
    if (Array.isArray(parsed)) {
      return parsed.map((t: any) => ({
        id: t.id || Math.random().toString(36).substring(7),
        title: t.title || "",
        status: t.status || "NOT_STARTED",
        completedAt: t.completedAt || null,
      }));
    }
  } catch {
    // Fallback if not valid JSON (backward compatibility)
    if (todayStr.trim()) {
      return [
        {
          id: "legacy",
          title: todayStr,
          status: "NOT_STARTED",
          completedAt: null,
        },
      ];
    }
  }
  return [];
}

const AUTOSAVE_MS = 30_000;

const STATUS_META: Record<ScrumTaskStatus, { label: string; tone: BadgeTone }> = {
  NOT_STARTED: { label: "Not Started", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "info" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "success" },
};

const STATUS_ORDER: ScrumTaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

/** Draft persistence — per calendar day, cleared on successful submission. */
function draftKey(): string {
  return `timeforge.scrum-draft.${toIsoDate(new Date())}`;
}

function readDraft(): DailyScrumValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const d = parsed as Partial<DailyScrumValues>;
    return {
      yesterday: typeof d.yesterday === "string" ? d.yesterday : "",
      today: typeof d.today === "string" ? d.today : "",
      blockers: typeof d.blockers === "string" ? d.blockers : "",
      notes: typeof d.notes === "string" ? d.notes : "",
      progress: typeof d.progress === "number" ? Math.min(100, Math.max(0, d.progress)) : 0,
      status: STATUS_ORDER.includes(d.status as ScrumTaskStatus)
        ? (d.status as ScrumTaskStatus)
        : "NOT_STARTED",
    };
  } catch {
    return null;
  }
}

interface ScrumTaskCardProps {
  /** Today's scrum entry when it exists — the card locks in submitted mode. */
  entry: ScrumEntry | null;
  /** Current work context shown in the card header. */
  task: WorkTask | null;
  /** Minutes tracked against today so far (real, from time entries). */
  trackedMinutes: number;
  loading: boolean;
  onToast: (toast: ToastState) => void;
}

/**
 * Section 2 — Today's Task scrum card. The backend stores exactly one scrum
 * per user per day (ScrumEntry is unique on userId+entryDate), so this is a
 * single card headed by the current task context rather than one card per
 * task. Yesterday / Today / Blockers are required; a submitted scrum locks
 * the card until explicitly re-opened for editing.
 *
 * Progress (0–100) and status persist on ScrumEntry; a COMPLETED scrum is
 * automatically read-only. Priority and estimates still have no backend
 * home and are intentionally absent.
 */
export function ScrumTaskCard({ entry, task, trackedMinutes, loading, onToast }: ScrumTaskCardProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  
  // Redesigned tasks array state
  const [tasks, setTasks] = useState<ScrumTaskItem[]>([]);

  // Mark Complete — patches status=COMPLETED and progress=100 on the scrum entry.
  const markComplete = useMutation({
    mutationFn: () => {
      if (!entry) throw new Error("No scrum entry to complete");
      
      // Also mark all individual tasks as complete
      const updatedTasks = tasks.map(t => ({
        ...t,
        status: "COMPLETED" as ScrumTaskStatus,
        completedAt: t.completedAt || new Date().toISOString()
      }));
      
      return updateScrumEntry(entry.id, {
        status: "COMPLETED",
        progress: 100,
        today: JSON.stringify(updatedTasks),
        version: entry.version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrum-entries"] });
      onToast({ message: "Daily scrum marked as completed." });
    },
    onError: (err) => {
      setServerError(err instanceof ApiError ? err.message : "Could not mark the scrum as complete");
    },
  });

  const { data: projects } = useQuery({ queryKey: ["catalog", "projects"], queryFn: listProjects });
  const projectName =
    (task?.projectId && projects?.find((p) => p.id === task.projectId)?.name) || "No project";

  // A COMPLETED scrum is automatically read-only.
  const completed = entry?.status === "COMPLETED";
  const locked = Boolean(entry) && (!editing || completed);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DailyScrumValues>({
    resolver: zodResolver(dailyScrumSchema),
    defaultValues: {
      yesterday: entry?.yesterday ?? "",
      today: entry?.today ?? "",
      blockers: entry?.blockers ?? "",
      notes: entry?.notes ?? "",
      progress: entry?.progress ?? 0,
      status: entry?.status ?? "NOT_STARTED",
    },
  });

  const liveProgress = useWatch({ control, name: "progress" });

  // Sync tasks state when entry or draft is loaded
  useEffect(() => {
    if (entry) {
      setTasks(parseTasks(entry.today));
    } else {
      const draft = readDraft();
      if (draft) {
        setTasks(parseTasks(draft.today));
      } else {
        setTasks([]);
      }
    }
  }, [entry]);

  // Keep today field in form in sync with tasks state for validation
  useEffect(() => {
    setValue("today", tasks.length > 0 ? JSON.stringify(tasks) : "");
  }, [tasks, setValue]);

  // Helper functions for tasks management
  const addTask = () => {
    const newTask: ScrumTaskItem = {
      id: Math.random().toString(36).substring(7),
      title: "",
      status: "NOT_STARTED",
      completedAt: null
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTaskTitle = (id: string, newTitle: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  const updateTaskStatus = (id: string, newStatus: ScrumTaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const completedAt = newStatus === "COMPLETED" ? (t.completedAt || new Date().toISOString()) : null;
        return { ...t, status: newStatus, completedAt };
      }
      return t;
    }));

    // Auto-update overall progress slider based on task completion
    setTimeout(() => {
      setTasks(currentTasks => {
        const completedCount = currentTasks.filter(t => t.status === "COMPLETED").length;
        const progressVal = currentTasks.length > 0 ? Math.round((completedCount / currentTasks.length) * 100) : 0;
        setValue("progress", progressVal);
        
        if (progressVal === 100) {
          setValue("status", "COMPLETED");
        } else if (progressVal > 0) {
          setValue("status", "IN_PROGRESS");
        }
        return currentTasks;
      });
    }, 50);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Allows marking complete in locked mode and patches the backend immediately
  const toggleIndividualTaskComplete = (taskId: string) => {
    if (!entry) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: "COMPLETED" as ScrumTaskStatus,
          completedAt: new Date().toISOString()
        };
      }
      return t;
    });
    
    setTasks(updatedTasks);
    const completedCount = updatedTasks.filter(t => t.status === "COMPLETED").length;
    const progressVal = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
    const overallStatus = progressVal === 100 ? "COMPLETED" as ScrumTaskStatus : entry.status;

    setServerError(null);
    updateScrumEntry(entry.id, {
      yesterday: entry.yesterday,
      today: JSON.stringify(updatedTasks),
      blockers: entry.blockers ?? "",
      notes: entry.notes ?? undefined,
      progress: progressVal,
      status: overallStatus,
      version: entry.version
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["scrum-entries"] });
      onToast({ message: "Task completed." });
    }).catch(err => {
      setServerError(err instanceof ApiError ? err.message : "Could not complete task");
    });
  };

  // Seed the form from the submitted entry, or restore a local draft.
  useEffect(() => {
    if (entry) {
      reset({
        yesterday: entry.yesterday,
        today: entry.today,
        blockers: entry.blockers ?? "",
        notes: entry.notes ?? "",
        progress: entry.progress,
        status: entry.status,
      });
      return;
    }
    const draft = readDraft();
    if (draft) reset(draft, { keepDefaultValues: true });
  }, [entry, reset]);

  // Auto-save the draft every 30s while the form is dirty and unlocked.
  useEffect(() => {
    if (locked) return;
    const id = setInterval(() => {
      const values = getValues();
      if (!values.yesterday && !values.today && !values.blockers && !values.notes) return;
      window.localStorage.setItem(draftKey(), JSON.stringify(values));
      setDraftSavedAt(new Date().toISOString());
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [locked, getValues]);

  // Warn before leaving the page with unsaved scrum text.
  useEffect(() => {
    if (locked || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [locked, isDirty]);

  const save = useMutation({
    mutationFn: (values: DailyScrumValues) =>
      entry
        ? updateScrumEntry(entry.id, {
            yesterday: values.yesterday,
            today: JSON.stringify(tasks),
            blockers: values.blockers,
            notes: values.notes || undefined,
            progress: values.progress,
            status: values.status,
            version: entry.version,
          })
        : createScrumEntry({
            entryDate: toIsoDate(new Date()),
            yesterday: values.yesterday,
            today: JSON.stringify(tasks),
            blockers: values.blockers,
            notes: values.notes || undefined,
            progress: values.progress,
            status: values.status,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrum-entries"] });
      window.localStorage.removeItem(draftKey());
      setDraftSavedAt(null);
      setEditing(false);
      onToast({ message: entry ? "Scrum updated." : "Scrum submitted." });
    },
    onError: (err) => {
      setServerError(err instanceof ApiError ? err.message : "Could not save your scrum update");
    },
  });

  const onSubmit = useCallback(
    (values: DailyScrumValues) => {
      setServerError(null);
      save.mutate(values);
    },
    [save],
  );

  const textFields: {
    id: "yesterday" | "blockers" | "notes";
    label: string;
    placeholder: string;
    required: boolean;
  }[] = [
    { id: "yesterday", label: "Yesterday", placeholder: "What did you complete yesterday?", required: true },
    { id: "blockers", label: "Blockers", placeholder: 'Anything in your way? Write "None" if not.', required: true },
    { id: "notes", label: "Notes", placeholder: "Any private notes or context for your manager?", required: false },
  ];

  return (
    <div className="rounded-[16px] border border-[#c3c6d2]/50 bg-white p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      {/* Task header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#c3c6d2]/40 pb-4">
        <div className="min-w-0">
          <h3 className="text-xl text-brand-navy">Daily Scrum</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-brand-ink">{task?.title ?? "General work"}</span>
            <span className="text-brand-muted">{projectName}</span>
            <span className="text-brand-muted">
              Tracked today: <strong className="text-brand-ink">{formatMinutes(trackedMinutes)}</strong>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {entry ? <StatusBadge {...STATUS_META[entry.status]} /> : null}
          {entry && completed ? (
            <StatusBadge label="Completed" tone="success" />
          ) : entry ? (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Locked
            </span>
          ) : (
            <StatusBadge label="Draft" tone="neutral" />
          )}
        </div>
      </div>

      {locked ? (
        /* Submitted / locked state */
        <div className="mt-5 space-y-5">
          {completed ? (
            /* COMPLETED — fully read-only, green banner */
            <div className="rounded-[10px] bg-[#f0fdf4] px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[#16a34a]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Daily scrum completed.
              </p>
              <p className="mt-0.5 text-xs text-brand-muted">
                Completed at {entry ? formatClockTime(entry.updatedAt) : "—"} — editing disabled.
              </p>
            </div>
          ) : (
            /* LOCKED (submitted but not completed) */
            <div className="flex items-start justify-between gap-3 rounded-[10px] bg-amber-50 px-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Today&apos;s Scrum Locked
                </p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Locked at {entry ? formatClockTime(entry.updatedAt) : "—"} — inputs are read-only
                  unless unlocked by an administrator.
                  {/* TODO: Add admin unlock endpoint (e.g. POST /scrum-entries/:id/unlock) */}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setServerError(null);
                    markComplete.mutate();
                  }}
                  disabled={markComplete.isPending}
                  className="flex items-center gap-1.5 rounded-[8px] bg-[#16a34a] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#15803d] disabled:opacity-60"
                >
                  {markComplete.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Mark Complete
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Edit
                </button>
              </div>
            </div>
          )}

          {serverError ? <FormBanner message={serverError} /> : null}

          {/* Stored progress */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-[0.8px] text-brand-muted">Task Progress</span>
              <span className="font-bold text-brand-ink">{entry?.progress ?? 0}%</span>
            </div>
            <ProgressBar percent={entry?.progress ?? 0} label="Task progress" />
          </div>

          {/* Redesigned Task-Based Objectives */}
          <div className="rounded-[12px] border border-[#c3c6d2]/40 p-4">
            <span className="mb-3 block text-sm font-bold text-brand-navy">Today&apos;s Tasks</span>
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[#f6f3f4] px-4 py-3 border border-[#c3c6d2]/20"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                    <span className="font-semibold text-sm text-brand-ink">
                      {task.title || "(Untitled Task)"}
                    </span>
                    {task.completedAt ? (
                      <span className="text-[10px] text-brand-muted font-medium bg-white px-2 py-0.5 rounded-md border border-[#c3c6d2]/20">
                        Completed: {formatClockTime(task.completedAt)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge {...STATUS_META[task.status]} />
                    {task.status !== "COMPLETED" && !completed ? (
                      <button
                        type="button"
                        onClick={() => toggleIndividualTaskComplete(task.id)}
                        className="flex items-center gap-1 rounded-[6px] bg-[#16a34a] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#15803d] transition-colors"
                      >
                        <Check className="h-3 w-3" />
                        Mark Complete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {tasks.length === 0 ? (
                <p className="text-sm text-brand-muted italic">No tasks specified for today.</p>
              ) : null}
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {textFields.map((f) => {
              const value = entry?.[f.id === "blockers" ? "blockers" : f.id === "notes" ? "notes" : f.id];
              return (
                <div key={f.id}>
                  <dt className="mb-1 text-sm font-medium text-brand-navy">{f.label}</dt>
                  <dd className="whitespace-pre-wrap rounded-[10px] bg-[#f6f3f4] px-3.5 py-2.5 text-sm text-brand-ink">
                    {value || "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : (
        /* Editable form */
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            // Keyboard shortcut: Ctrl/Cmd + Enter submits the scrum.
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit(onSubmit)();
            }
          }}
          noValidate
          className="mt-5 space-y-4"
        >
          {serverError ? <FormBanner message={serverError} /> : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Render Text Fields (excluding today) */}
            {textFields.map((f) => (
              <div key={f.id}>
                <FieldLabel htmlFor={`scrum-${f.id}`}>
                  {f.label}
                  {f.required ? null : (
                    <span className="ml-1 text-xs font-normal text-brand-muted">(optional)</span>
                  )}
                </FieldLabel>
                <Textarea
                  id={`scrum-${f.id}`}
                  rows={3}
                  disabled={loading}
                  placeholder={f.placeholder}
                  invalid={Boolean(errors[f.id])}
                  {...register(f.id)}
                />
                <FieldError message={errors[f.id]?.message} />
              </div>
            ))}

            {/* Redesigned Today's Objectives as an Interactive Task List */}
            <div className="lg:col-span-2 border-t border-[#c3c6d2]/30 pt-4 mt-2">
              <FieldLabel htmlFor="scrum-tasks">Today&apos;s Tasks</FieldLabel>
              <div className="space-y-3 mt-2">
                {tasks.map((task, idx) => (
                  <div key={task.id} className="flex flex-wrap items-center gap-3 bg-[#f6f3f4]/50 p-3 rounded-[12px] border border-[#c3c6d2]/20">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                      placeholder={`Task #${idx + 1}...`}
                      className="flex-1 min-w-[200px] h-10 rounded-[8px] border border-[#c3c6d2] px-3 text-sm focus:outline-none focus:border-brand"
                    />
                    <div className="flex items-center gap-1.5">
                      {STATUS_ORDER.map((statusVal) => (
                        <button
                          key={statusVal}
                          type="button"
                          onClick={() => updateTaskStatus(task.id, statusVal)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition-colors",
                            task.status === statusVal
                              ? statusVal === "COMPLETED"
                                ? "bg-green-600 text-white ring-green-600"
                                : statusVal === "BLOCKED"
                                  ? "bg-red-600 text-white ring-red-600"
                                  : statusVal === "IN_PROGRESS"
                                    ? "bg-brand text-white ring-brand"
                                    : "bg-gray-600 text-white ring-gray-600"
                              : "bg-white text-brand-muted ring-[#c3c6d2]/40 hover:text-brand-navy"
                          )}
                        >
                          {STATUS_META[statusVal].label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="p-2 rounded-lg text-brand-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTask}
                  className="flex items-center gap-1.5 rounded-[8px] border border-dashed border-[#c3c6d2] px-4 py-2 text-sm font-bold text-brand hover:bg-[#f6f3f4] transition-colors mt-2 cursor-pointer"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Add Task
                </button>
                <FieldError message={errors.today?.message} />
              </div>
            </div>
          </div>

          {/* Progress + status — persisted on the scrum entry.
              These connect directly to the ScrumEntry entity properties (progress and status)
              on the backend and are not local-only placeholders. */}
          <div className="grid grid-cols-1 gap-4 rounded-[10px] bg-[#f6f3f4] px-4 py-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="scrum-progress"
                className="flex items-center justify-between text-sm font-medium text-brand-navy"
              >
                Overall Progress
                <span className="text-sm font-bold text-brand">{liveProgress}%</span>
              </label>
              <input
                id="scrum-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={loading}
                aria-valuetext={`${liveProgress}%`}
                className="mt-2 w-full accent-brand"
                {...register("progress", { valueAsNumber: true })}
              />
              <FieldError message={errors.progress?.message} />
            </div>
            <div>
              <p className="text-sm font-medium text-brand-navy">Overall Status</p>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Task status" className="mt-2 flex flex-wrap gap-1.5">
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={field.value === s}
                        onClick={() => field.onChange(s)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 transition-colors",
                          field.value === s
                            ? "bg-brand text-white ring-brand"
                            : "bg-white text-brand-muted ring-[#c3c6d2]/50 hover:text-brand-navy",
                        )}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                )}
              />
              <p className="mt-1.5 text-xs text-brand-muted/70">
                Submitting as Completed locks this scrum for the day.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#c3c6d2]/40 pt-4">
            <p className="text-xs text-brand-muted">
              {draftSavedAt ? `Draft auto-saved at ${formatClockTime(draftSavedAt)} · ` : ""}
              Auto-saves every 30s · Ctrl+Enter to submit
            </p>
            <div className="flex items-center gap-3">
              {entry ? (
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      yesterday: entry.yesterday,
                      today: entry.today,
                      blockers: entry.blockers ?? "",
                      notes: entry.notes ?? "",
                      progress: entry.progress,
                      status: entry.status,
                    });
                    setTasks(parseTasks(entry.today));
                    setEditing(false);
                  }}
                  className="text-sm font-bold text-brand-muted hover:text-brand-navy"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="submit"
                disabled={save.isPending || loading}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-[10px] bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-[#1467d6] disabled:opacity-60",
                )}
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                )}
                {entry ? "Update Scrum" : "Lock Daily Plan"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
