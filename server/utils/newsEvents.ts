import { EventEmitter } from "events";

export const newsEmitter = new EventEmitter();
newsEmitter.setMaxListeners(50);

export let generating = false;
export function setGenerating(value: boolean) {
  generating = value;
}
