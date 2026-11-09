export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}
export const badRequest = (message: string, fields?: Record<string, string>, code = "INVALID") => new ApiError(422, code, message, fields);
export const notFound = (what: string) => new ApiError(404, "NOT_FOUND", `${what} was not found.`);
export const forbidden = (message = "You do not have access to this.") => new ApiError(403, "FORBIDDEN", message);
export const unauthorized = (message = "Please sign in.") => new ApiError(401, "UNAUTHENTICATED", message);
export const conflict = (message: string, code = "CONFLICT") => new ApiError(409, code, message);
