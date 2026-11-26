import { createHash } from "node:crypto";
import { ApiError, bad, conflict, missing } from "./errors.js";
import type { Context } from "./store.js";

export type Result = { status: number; body?: unknown; location?: string };
export const ok = (body: unknown, status = 200): Result => ({ status, body });
export const created = (body: unknown, location: string): Result => ({
  status: 201,
  body,
  location,
});
export const noContent = (): Result => ({ status: 204 });

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    bad("body", "Expected a JSON object");
  return value as Record<string, unknown>;
}

export function only(value: Record<string, unknown>, names: string[]): void {
  for (const name of Object.keys(value)) if (!names.includes(name)) bad(name, "Unknown field");
}

export function text(value: unknown, field: string, max: number, nullable = false): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== "string") bad(field, "Expected a string");
  const clean = value.trim();
  if (!clean || clean.length > max) bad(field, `Must contain 1–${max} characters`);
  return clean;
}

export function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > max)
    bad(field, `Must be at most ${max} characters`);
  return value;
}

export function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") bad(field, "Expected a boolean");
  return value;
}

export function integer(value: unknown, field: string, min: number, max = 999999999): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max)
    bad(field, `Expected an integer from ${min} to ${max}`);
  return value as number;
}

export function date(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    bad(field, "Expected YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    bad(field, "Invalid calendar date");
  return value;
}

export function month(value: unknown, field = "month"): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) bad(field, "Expected YYYY-MM");
  date(`${value}-01`, field);
  return value;
}

export function time(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    bad(field, "Expected HH:mm UTC");
  return value;
}

export function query(url: URL, allowed: string[]): URLSearchParams {
  for (const key of url.searchParams.keys())
    if (!allowed.includes(key)) bad(key, "Unknown query parameter");
  return url.searchParams;
}

export function requiredQuery(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  if (value === null) bad(name, "Required");
  return value;
}

export function requireDataset(request: Request, context: Context): void {
  const id = request.headers.get("x-minidesk-dataset-id");
  if (!id || id !== context.datasetId)
    conflict("DATASET_RESET", "MiniDesk reset; refresh and try again");
}

export function requireVersion(request: Request, current: number): void {
  if (request.headers.get("if-match") !== `"${current}"`) conflict();
}

export function getById<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((entry) => entry.id === id);
  if (!item) missing();
  return item;
}

export function parsePage<T extends { id: string }>(
  items: T[],
  params: URLSearchParams,
  scope: string,
  datasetId: string,
): { items: T[]; nextCursor: string | null } {
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 20 : integer(Number(rawLimit), "limit", 1, 100);
  const snapshot = createHash("sha256")
    .update(items.map((item) => item.id).join("\n"))
    .digest("base64url");
  let offset = 0;
  const cursor = params.get("cursor");
  if (cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
        offset: number;
        scope: string;
        datasetId: string;
        snapshot: string;
      };
      if (
        !Number.isSafeInteger(parsed.offset) ||
        parsed.offset < 0 ||
        parsed.scope !== scope ||
        parsed.datasetId !== datasetId ||
        parsed.snapshot !== snapshot
      )
        bad("cursor", "Invalid or expired cursor");
      offset = parsed.offset;
    } catch {
      bad("cursor", "Invalid cursor");
    }
  }
  const next = offset + limit;
  return {
    items: items.slice(offset, next),
    nextCursor:
      next < items.length
        ? Buffer.from(JSON.stringify({ offset: next, scope, datasetId, snapshot })).toString(
            "base64url",
          )
        : null,
  };
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json")
    throw new ApiError(415, "VALIDATION_ERROR", "Content-Type must be application/json");
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 32768)
    throw new ApiError(413, "VALIDATION_ERROR", "Request is too large");
  try {
    return object(JSON.parse(raw));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    bad("body", "Invalid JSON");
  }
}

export async function idempotent(
  context: Context,
  request: Request,
  path: string,
  body: Record<string, unknown>,
  run: () => Result,
): Promise<Result> {
  const key = request.headers.get("idempotency-key");
  if (!key) return run();
  if (key.length > 128 || key.length < 1) bad("Idempotency-Key", "Invalid key");
  const signature = createHash("sha256")
    .update(`${request.method}:${path}:${JSON.stringify(body)}`)
    .digest("hex");
  const scopedKey = `${request.method}:${path}:${key}`;
  const existing = context.state.idempotency[scopedKey];
  if (existing) {
    if (existing.signature !== signature) conflict();
    return { status: existing.status, body: existing.body, location: existing.location };
  }
  const result = run();
  context.state.idempotency[scopedKey] = {
    signature,
    status: result.status,
    body: result.body,
    location: result.location,
  };
  return result;
}

export function rateLimit(context: Context): void {
  const cutoff = context.now.getTime() - 60_000;
  context.state.writeTicks = context.state.writeTicks.filter((tick) => tick > cutoff);
  if (context.state.writeTicks.length >= 120)
    throw new ApiError(429, "RATE_LIMITED", "Demo is busy; try again shortly");
  if (context.state.writeCount >= 10_000)
    throw new ApiError(429, "RATE_LIMITED", "Demo write capacity reached until the next reset");
  context.state.writeTicks.push(context.now.getTime());
  context.state.writeCount++;
}
