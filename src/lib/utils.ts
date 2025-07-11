/**
 * @module utils
 *
 * Utility functions for the Notion SDK.
 * Provides helper functions for type checking and validation.
 */

/**
 * Utility function for exhaustive type checking.
 * This function ensures all cases in a union type are handled.
 * TypeScript will error if not all cases are covered.
 *
 * @param value - The value that should never be reached
 * @throws {Error} Always throws an error with the unexpected value
 *
 * @example
 * ```typescript
 * type Status = "pending" | "approved" | "rejected";
 *
 * function handleStatus(status: Status) {
 *   switch (status) {
 *     case "pending":
 *       return "Waiting...";
 *     case "approved":
 *       return "Success!";
 *     case "rejected":
 *       return "Failed";
 *     default:
 *       return arkToNever(status); // TypeScript error if a case is missed
 *   }
 * }
 * ```
 */
export function arkToNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}
