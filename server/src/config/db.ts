import mongoose from "mongoose";
import { env } from "./env";

mongoose.connection.on("connected", () => console.log("✅ Mongo connected"));
mongoose.connection.on("error", (err) => console.error("Mongo error:", err));
mongoose.connection.on("disconnected", () => console.warn("⚠️  Mongo disconnected"));

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
}

export function mongoStatus(): "up" | "down" {
  return mongoose.connection.readyState === 1 ? "up" : "down";
}
