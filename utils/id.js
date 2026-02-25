import { randomUUID } from "crypto";

export function generateId(prefix) {
  return `${prefix}_${randomUUID()}`;
}
