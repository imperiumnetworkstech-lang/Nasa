import type { Message } from "@/lib/types";

/**
 * Delivery state for communication-delay mode. A message is "sent" once stored on the server,
 * "received" only after its simulated one-way delay has elapsed, and "acknowledged" only when the
 * recipient explicitly acknowledges it. (Locally queued items never reach this function.)
 */
export type DeliveryState = "sent" | "received" | "acknowledged";

export function deliveryState(m: Pick<Message, "deliverAt" | "acknowledgedAt">, now = Date.now()): DeliveryState {
  if (m.acknowledgedAt) return "acknowledged";
  return Date.parse(m.deliverAt) <= now ? "received" : "sent";
}

export const DELIVERY_LABEL: Record<DeliveryState, string> = {
  sent: "Sent — in transit (comm delay)",
  received: "Received",
  acknowledged: "Acknowledged",
};
