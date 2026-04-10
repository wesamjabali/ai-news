import { EventEmitter } from "events";

export const newsEmitter = new EventEmitter();
newsEmitter.setMaxListeners(50);

export let generating = false;
export let inProgressContent = "";

export function setGenerating(value: boolean) {
  generating = value;
}

export function resetInProgressContent() {
  inProgressContent = "";
}

export function appendInProgressContent(chunk: string) {
  inProgressContent += chunk;
}
