import { v4 as uuidv4 } from "uuid";

export function newId() {
  return uuidv4();
}

export function now() {
  return new Date().toISOString();
}
