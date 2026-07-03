"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const stages = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "WON", "LOST", "ARCHIVED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const taskTypes = ["CALL", "MEETING", "WHATSAPP", "REMINDER"];

type Note = {
  id: string;
  note: string;
};

type Task = {
  completedAt?: Date | string | null;
  dueAt?: Date | string | null;
  id: string;
  taskType: string;
  title: string;
};

type Visit = {
  id: string;
  notes?: string | null;
  scheduledAt: Date | string;
  status: string;
};

export function LeadLifecycleActions({
  leadId,
  notes,
  priority,
  stage,
  tasks,
  visits
}: {
  leadId: string;
  notes: Note[];
  priority: string;
  stage: string;
  tasks: Task[];
  visits: Visit[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("CALL");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  async function updateLead(body: Record<string, unknown>) {
    setBusy("lead");
    const response = await fetch(`/api/leads/${leadId}`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    });
    setBusy("");
    setStatusMessage(response.ok ? "Lead updated." : "Could not update lead.");
    router.refresh();
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy("note");
    const response = await fetch(`/api/leads/${leadId}/notes`, {
      body: JSON.stringify({ note }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setBusy("");
    if (response.ok) setNote("");
    setStatusMessage(response.ok ? "Note added." : "Could not add note.");
    router.refresh();
  }

  async function editNote(noteId: string, value: string) {
    const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
      body: JSON.stringify({ note: value }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setStatusMessage(response.ok ? "Note edited." : "Could not edit note.");
    router.refresh();
  }

  async function deleteNote(noteId: string) {
    const response = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
      method: "DELETE"
    });
    setStatusMessage(response.ok ? "Note deleted." : "Could not delete note.");
    router.refresh();
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    setBusy("task");
    const response = await fetch(`/api/leads/${leadId}/tasks`, {
      body: JSON.stringify({
        dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
        taskType,
        title: taskTitle
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setBusy("");
    if (response.ok) {
      setTaskTitle("");
      setTaskDueAt("");
    }
    setStatusMessage(response.ok ? "Task created." : "Could not create task.");
    router.refresh();
  }

  async function completeTask(taskId: string, completed: boolean) {
    const response = await fetch(`/api/leads/${leadId}/tasks/${taskId}`, {
      body: JSON.stringify({ completed }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    setStatusMessage(response.ok ? "Task updated." : "Could not update task.");
    router.refresh();
  }

  async function scheduleVisit() {
    if (!visitAt) return;
    setBusy("visit");
    const response = await fetch(`/api/leads/${leadId}/visits`, {
      body: JSON.stringify({
        notes: visitNotes || undefined,
        scheduledAt: new Date(visitAt).toISOString()
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    setBusy("");
    if (response.ok) {
      setVisitAt("");
      setVisitNotes("");
    }
    setStatusMessage(response.ok ? "Site visit scheduled." : "Could not schedule visit.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-5">
        <p className="text-sm font-bold text-violet-700">Lead Status</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select className="h-12 rounded-2xl border px-4 text-sm font-bold" defaultValue={stage} onChange={(event) => updateLead({ stage: event.target.value })}>
            {stages.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="h-12 rounded-2xl border px-4 text-sm font-bold" defaultValue={priority} onChange={(event) => updateLead({ priority: event.target.value })}>
            {priorities.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => updateLead({ stage: "CONTACTED", nextAction: "Buyer contacted" })} size="sm">
            {busy === "lead" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark Contacted
          </Button>
          <Button onClick={() => updateLead({ stage: "WON" })} size="sm" variant="outline">Won</Button>
          <Button onClick={() => updateLead({ stage: "LOST" })} size="sm" variant="outline">Lost</Button>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5">
        <p className="text-sm font-bold text-violet-700">Notes</p>
        <div className="mt-4 flex gap-2">
          <input className="h-11 min-w-0 flex-1 rounded-2xl border px-4 text-sm font-semibold" onChange={(event) => setNote(event.target.value)} placeholder="Add inquiry note" value={note} />
          <Button onClick={addNote} size="sm"><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="mt-4 space-y-3">
          {notes.map((item) => <EditableNote key={item.id} note={item} onDelete={deleteNote} onSave={editNote} />)}
          {!notes.length ? <p className="text-sm text-muted-foreground">No notes yet.</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5">
        <p className="text-sm font-bold text-violet-700">Follow-up Tasks</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[8rem_1fr_13rem_auto]">
          <select className="h-11 rounded-2xl border px-3 text-sm font-bold" onChange={(event) => setTaskType(event.target.value)} value={taskType}>
            {taskTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input className="h-11 rounded-2xl border px-4 text-sm font-semibold" onChange={(event) => setTaskTitle(event.target.value)} placeholder="Follow-up title" value={taskTitle} />
          <input className="h-11 rounded-2xl border px-4 text-sm font-semibold" onChange={(event) => setTaskDueAt(event.target.value)} type="datetime-local" value={taskDueAt} />
          <Button onClick={addTask} size="sm"><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between" key={task.id}>
              <div>
                <p className="text-sm font-bold">{task.taskType}: {task.title}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {task.dueAt ? new Date(task.dueAt).toLocaleString("en-IN") : "No due date"} · {task.completedAt ? "Completed" : "Open"}
                </p>
              </div>
              <Button onClick={() => completeTask(task.id, !task.completedAt)} size="sm" variant="outline">
                {task.completedAt ? "Reopen" : "Complete"}
              </Button>
            </div>
          ))}
          {!tasks.length ? <p className="text-sm text-muted-foreground">No follow-ups created.</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-700">
          <CalendarDays className="h-4 w-4" />
          Site Visit Scheduler
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[14rem_1fr_auto]">
          <input className="h-11 rounded-2xl border px-4 text-sm font-semibold" onChange={(event) => setVisitAt(event.target.value)} type="datetime-local" value={visitAt} />
          <input className="h-11 rounded-2xl border px-4 text-sm font-semibold" onChange={(event) => setVisitNotes(event.target.value)} placeholder="Visit note" value={visitNotes} />
          <Button onClick={scheduleVisit} size="sm">Schedule</Button>
        </div>
        <div className="mt-4 space-y-3">
          {visits.map((visit) => (
            <div className="rounded-2xl bg-muted p-4" key={visit.id}>
              <p className="text-sm font-bold">{new Date(visit.scheduledAt).toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{visit.status}{visit.notes ? ` · ${visit.notes}` : ""}</p>
            </div>
          ))}
          {!visits.length ? <p className="text-sm text-muted-foreground">No site visits scheduled.</p> : null}
        </div>
      </section>

      {statusMessage ? <p className="rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">{statusMessage}</p> : null}
    </div>
  );
}

function EditableNote({
  note,
  onDelete,
  onSave
}: {
  note: Note;
  onDelete: (id: string) => void;
  onSave: (id: string, value: string) => void;
}) {
  const [value, setValue] = useState(note.note);

  return (
    <div className="rounded-2xl bg-muted p-4">
      <textarea className="min-h-20 w-full rounded-2xl border bg-white p-3 text-sm font-semibold" onChange={(event) => setValue(event.target.value)} value={value} />
      <div className="mt-2 flex gap-2">
        <Button onClick={() => onSave(note.id, value)} size="sm" variant="outline">
          <Save className="h-4 w-4" />
          Save
        </Button>
        <Button onClick={() => onDelete(note.id)} size="sm" variant="outline">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
