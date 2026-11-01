import { EventEmitter } from "node:events";

export type LiveEvent =
  | { type: "videos"; action: "created" | "updated" | "deleted"; id?: number }
  | { type: "users"; action: "created" | "updated" | "deleted"; id?: number }
  | { type: "plans"; action: "created" | "updated" | "deleted"; id?: number }
  | { type: "ads"; action: "created" | "updated" | "deleted" | "impression" | "click"; id?: number }
  | { type: "chats"; action: "created" | "updated" | "deleted" | "message"; id?: number }
  | { type: "settings"; action: "updated"; id?: number };

const globalForEvents = globalThis as typeof globalThis & {
  __duckeFlixBus?: EventEmitter;
};

export const bus =
  globalForEvents.__duckeFlixBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0);
    return e;
  })();

globalForEvents.__duckeFlixBus = bus;

export function publish(event: LiveEvent): void {
  bus.emit("live", event);
}

export function subscribe(listener: (event: LiveEvent) => void): () => void {
  bus.on("live", listener);
  return () => {
    bus.off("live", listener);
  };
}
