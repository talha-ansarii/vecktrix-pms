"use client";

import { useState, useTransition } from "react";
import {
  createTask,
  approveTask,
  transitionTask,
  reviewTask,
  toggleClientVisibility,
  addTaskComment,
} from "@/lib/actions/tasks";
import { logTimeEntry } from "@/lib/actions/time";
import { StatusBadge } from "@/components/ui";
import type { TaskStatus } from "@prisma/client";

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  clientVisible: boolean;
  sortOrder: number;
};

export function MilestoneTaskPanel({
  projectId,
  milestoneId,
  milestoneStatus,
  tasks,
}: {
  projectId: string;
  milestoneId: string;
  milestoneStatus: string;
  tasks: TaskItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);

  const canAddTasks = ["active", "client_changes_requested", "internal_complete"].includes(milestoneStatus);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3 border-t border-white/6 pt-4">
      {tasks.length > 0 && (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-[4px] border border-white/6 bg-black/20 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{task.title}</p>
                  <p className="text-xs text-text-darkSecondary">#{task.sortOrder + 1}</p>
                </div>
                <div className="flex items-center gap-2">
                  {task.clientVisible && <span className="text-xs text-emerald-400">client visible</span>}
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {task.status === "pending_pm_approval" && (
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-secondary-dark text-xs px-2 py-1"
                    onClick={() => run(() => approveTask(task.id))}
                  >
                    PM Approve
                  </button>
                )}
                {task.status === "todo" && (
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-secondary-dark text-xs px-2 py-1"
                    onClick={() => run(() => transitionTask(task.id, "in_progress"))}
                  >
                    Start
                  </button>
                )}
                {task.status === "in_progress" && (
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-secondary-dark text-xs px-2 py-1"
                    onClick={() => run(() => transitionTask(task.id, "in_review"))}
                  >
                    Submit review
                  </button>
                )}
                {task.status === "in_review" && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-secondary-dark text-xs px-2 py-1"
                      onClick={() => run(() => reviewTask({ taskId: task.id, status: "approved" }))}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-secondary-dark text-xs px-2 py-1"
                      onClick={() =>
                        run(() =>
                          reviewTask({
                            taskId: task.id,
                            status: "changes_requested",
                            feedback: "Changes requested",
                          }),
                        )
                      }
                    >
                      Request changes
                    </button>
                  </>
                )}
                {task.status === "changes_requested" && (
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-secondary-dark text-xs px-2 py-1"
                    onClick={() => run(() => transitionTask(task.id, "in_progress"))}
                  >
                    Resume work
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  className="btn-secondary-dark text-xs px-2 py-1"
                  onClick={() => run(() => toggleClientVisibility(task.id, !task.clientVisible))}
                >
                  {task.clientVisible ? "Hide from client" : "Show to client"}
                </button>
                <button
                  type="button"
                  className="btn-secondary-dark text-xs px-2 py-1"
                  onClick={() => setCommentFor(commentFor === task.id ? null : task.id)}
                >
                  Comment
                </button>
              </div>

              {commentFor === task.id && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const content = fd.get("content") as string;
                    run(async () => {
                      await addTaskComment(task.id, content);
                      setCommentFor(null);
                    });
                    e.currentTarget.reset();
                  }}
                >
                  <input name="content" required placeholder="Internal comment" className="input-dark flex-1" />
                  <button type="submit" disabled={pending} className="btn-primary-dark text-xs px-3 py-2">
                    Post
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canAddTasks && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(async () => {
              await createTask({
                projectId,
                milestoneId,
                title: fd.get("title") as string,
                description: (fd.get("description") as string) || undefined,
              });
              e.currentTarget.reset();
            });
          }}
        >
          <p className="overline-text text-text-darkSecondary">Add task</p>
          <input name="title" required placeholder="Task title" className="input-dark" />
          <input name="description" placeholder="Description (optional)" className="input-dark" />
          <button type="submit" disabled={pending} className="btn-secondary-dark text-sm px-3 py-1.5">
            {pending ? "Saving…" : "Create task"}
          </button>
        </form>
      )}

      <form
        className="space-y-2 border-t border-white/6 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(async () => {
            await logTimeEntry({
              projectId,
              taskId: (fd.get("taskId") as string) || undefined,
              hours: Number(fd.get("hours")),
              description: (fd.get("description") as string) || undefined,
              date: (fd.get("date") as string) || undefined,
            });
            e.currentTarget.reset();
          });
        }}
      >
        <p className="overline-text text-text-darkSecondary">Log time</p>
        <div className="grid grid-cols-2 gap-2">
          <input name="hours" type="number" step="0.25" min="0.25" required placeholder="Hours" className="input-dark" />
          <input name="date" type="date" className="input-dark" />
        </div>
        <select name="taskId" className="input-dark">
          <option value="">No task</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <input name="description" placeholder="What did you work on?" className="input-dark" />
        <button type="submit" disabled={pending} className="btn-secondary-dark text-sm px-3 py-1.5">
          Log hours
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
