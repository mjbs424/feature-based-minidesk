export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function bad(field: string, message: string): never {
  throw new ApiError(400, "VALIDATION_ERROR", "Invalid request", { [field]: message });
}

export function missing(): never {
  throw new ApiError(404, "NOT_FOUND", "Resource not found");
}

export function conflict(
  code = "CONFLICT",
  message = "Resource changed; refresh and try again",
): never {
  throw new ApiError(409, code, message);
}
