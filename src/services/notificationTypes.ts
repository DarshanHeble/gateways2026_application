export type Role = "participant" | "team";

/** "all"/"participant"/"team" match by role; an email targets one person. */
export type NotificationTarget = "all" | Role | { email: string };

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  target: NotificationTarget;
  /** Optional deep-link route opened when the notification is tapped. */
  route?: string;
  /**
   * When this device first saw the announcement. The sheet has no timestamp
   * column and the backend's `createdAt` is invented per request, so first-seen
   * is the only honest "when".
   */
  createdAt: number;
  read: boolean;
  /** Who it's for, in the organisers' own words ("Prompt Engineering Participants"). */
  audience?: string;
  /** End of the day it stops applying, from the sheet's "Announcement Expiry On". */
  expiresAt?: number | null;
}

export function targetLabel(target: NotificationTarget): string {
  if (target === "all") return "EVERYONE";
  if (target === "participant") return "PARTICIPANTS";
  if (target === "team") return "TEAM";
  return target.email.toUpperCase();
}

export function matchesTarget(target: NotificationTarget, role: Role): boolean {
  if (target === "all") return true;
  if (typeof target === "object") return true; // no per-user identity yet — visible to all, labelled with the email
  return target === role;
}
