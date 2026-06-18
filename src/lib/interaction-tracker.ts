export type TrackedEventProperties = Record<string, string | number | boolean | null | undefined>;

type HomeInteractionEvent = {
  name: string;
  ts: number;
  props: TrackedEventProperties;
};

const STORAGE_KEY = "ff-interaction-events-v1";
const MAX_EVENTS = 240;

function clampEvents(next: HomeInteractionEvent[]) {
  if (next.length <= MAX_EVENTS) return next;
  return next.slice(next.length - MAX_EVENTS);
}

function readStoredEvents(): HomeInteractionEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: any) => {
      return typeof item?.name === "string" && typeof item?.ts === "number" && item?.props;
    }) as HomeInteractionEvent[];
  } catch {
    return [];
  }
}

function writeStoredEvents(next: HomeInteractionEvent[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clampEvents(next)));
  } catch {
    // avoid crashing on storage quota issues
  }
}

export function pushHomeInteractionEvent(name: string, props: TrackedEventProperties = {}) {
  if (typeof window === "undefined") return;

  const event: HomeInteractionEvent = {
    name,
    ts: Date.now(),
    props,
  };

  const previous = readStoredEvents();
  writeStoredEvents([...previous, event]);

  const w = window as any;
  const payload = { ...props };

  // 兼容常见的前端分析接入，不会影响主流程
  if (typeof w.gtag === "function") {
    w.gtag("event", name, payload);
  }

  if (typeof w.plausible === "function") {
    w.plausible(name, { props: payload });
  }

  if (w?.analytics && typeof w.analytics.track === "function") {
    w.analytics.track(name, payload);
  }

  try {
    const detailEvent = new CustomEvent("ff:interaction", {
      detail: event,
    });
    window.dispatchEvent(detailEvent);
  } catch {
    // CustomEvent may fail in some older browsers; ignore silently
  }
}
