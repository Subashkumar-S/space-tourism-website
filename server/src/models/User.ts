import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // null for Google-only accounts.
    passwordHash: { type: String, default: null },
    // Absent for password-only accounts; sparse unique so multiple such users coexist.
    googleId: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);

// The minimal user shape stored in the session and returned to the client.
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

export function toSessionUser(doc: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}): SessionUser {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role === "admin" ? "admin" : "user",
  };
}
