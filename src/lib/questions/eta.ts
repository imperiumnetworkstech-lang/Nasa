/**
 * Ask the Doctor — delivery timing for store-and-forward questions.
 * A question leaves at the next communication window (or immediately with a continuous link),
 * then needs the one-way light delay to reach Earth. Answers take the same path back.
 */
export function nextWindow(now: Date, everyHours: number): Date {
  if (!everyHours || everyHours <= 0) return now;
  const step = everyHours * 3_600_000;
  // Windows start at 00:00 UTC and repeat every `everyHours`.
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const n = Math.ceil((now.getTime() - dayStart) / step);
  return new Date(dayStart + n * step);
}

export function questionTiming(now: Date, opts: { delaySeconds: number; windowEveryHours: number }) {
  const send = nextWindow(now, opts.windowEveryHours);
  const arrive = new Date(send.getTime() + opts.delaySeconds * 1000);
  return { sendAt: send.toISOString(), arriveAt: arrive.toISOString() };
}

/**
 * Earliest a reply could arrive back, assuming the doctor answers as soon as the question lands.
 * Shown to crew as an honest lower bound — never as a promise.
 */
export function earliestReply(arriveAt: string, opts: { delaySeconds: number; windowEveryHours: number }) {
  const replySend = nextWindow(new Date(arriveAt), opts.windowEveryHours);
  return new Date(replySend.getTime() + opts.delaySeconds * 1000).toISOString();
}

export function questionStage(q: { sendAt: string; arriveAt: string; answer: { arriveAt: string } | null }, now = Date.now()) {
  if (q.answer && Date.parse(q.answer.arriveAt) <= now) return "answered" as const;
  if (q.answer) return "reply-travelling" as const;
  if (Date.parse(q.arriveAt) <= now) return "with-doctor" as const;
  if (Date.parse(q.sendAt) <= now) return "travelling" as const;
  return "waiting-window" as const;
}
