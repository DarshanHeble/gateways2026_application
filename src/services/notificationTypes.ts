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
  createdAt: number;
  read: boolean;
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
