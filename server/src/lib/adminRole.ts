import { User } from "../models/User";
import { env } from "../config/env";

// Bootstrap/hardening: auto-promote configured ADMIN_EMAILS to admin at signup/login.
// Promote-only — removing an email from the list does NOT demote an existing admin.
export async function applyAdminRole(
  user: InstanceType<typeof User>
): Promise<void> {
  if (user.role !== "admin" && env.adminEmails.includes(user.email.toLowerCase())) {
    user.role = "admin";
    await user.save();
  }
}
