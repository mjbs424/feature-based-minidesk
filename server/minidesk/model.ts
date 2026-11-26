export type Category = { id: string; label: string; isDefault: boolean };
export type Task = {
  id: string;
  title: string;
  notes: string | null;
  categoryId: string;
  dueDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  isFocusPriority: boolean;
  prioritySelectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};
export type Expense = {
  id: string;
  description: string;
  notes: string | null;
  amountMinor: number;
  currency: "USD";
  categoryId: string;
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};
export type Budget = {
  month: string;
  amountMinor: number;
  currency: "USD";
  updatedAt: string;
  version: number;
};
export type Segment = { start: string; end: string | null };
export type FocusSession = {
  id: string;
  status: "running" | "paused" | "completed";
  taskId: string | null;
  taskTitle: string | null;
  completeTaskOnTarget: boolean;
  taskCompletionApplied: boolean;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  segments: Segment[];
};
export type RumEvent = {
  eventId: string;
  kind: "page_view" | "web_vital";
  route: string;
  occurredAt: string;
  metric?: "LCP" | "INP" | "CLS";
  value?: number;
};
export type IdempotencyRecord = {
  signature: string;
  status: number;
  body: unknown;
  location?: string;
};
export type State = {
  taskCategories: Category[];
  expenseCategories: Category[];
  tasks: Task[];
  expenses: Expense[];
  budgets: Budget[];
  focusSessions: FocusSession[];
  rumEvents: RumEvent[];
  idempotency: Record<string, IdempotencyRecord>;
  writeTicks: number[];
  writeCount: number;
};

const taskDefaults = ["work", "personal", "errands", "travel", "other"];
const expenseDefaults = ["groceries", "bills", "transport", "food", "other"];

export function newState(): State {
  return {
    taskCategories: taskDefaults.map((id) => ({
      id,
      label: id[0].toUpperCase() + id.slice(1),
      isDefault: true,
    })),
    expenseCategories: expenseDefaults.map((id) => ({
      id,
      label: id[0].toUpperCase() + id.slice(1),
      isDefault: true,
    })),
    tasks: [],
    expenses: [],
    budgets: [],
    focusSessions: [],
    rumEvents: [],
    idempotency: {},
    writeTicks: [],
    writeCount: 0,
  };
}

export function windowStart(now: Date): Date {
  const start = new Date(now);
  start.setUTCHours(now.getUTCHours() < 12 ? 0 : 12, 0, 0, 0);
  return start;
}

export function nextReset(start: Date): string {
  return new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString();
}
