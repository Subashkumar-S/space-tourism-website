import { Schema, model, InferSchemaType } from "mongoose";

export const LAUNCH_STATUSES = [
  "scheduled",
  "full",
  "departed",
  "cancelled",
] as const;
export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

const launchSchema = new Schema(
  {
    destination: {
      type: Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
      index: true,
    },
    departAt: { type: Date, required: true, index: true },
    durationLabel: { type: String, required: true }, // e.g. "3 days"
    pricePerSeat: { type: Number, required: true, min: 0 }, // integer cents (USD)
    seatsTotal: { type: Number, required: true, min: 1 },
    // Decremented atomically at booking time (M3); never below 0.
    seatsAvailable: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: LAUNCH_STATUSES,
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true }
);

export type LaunchDoc = InferSchemaType<typeof launchSchema>;
export const Launch = model("Launch", launchSchema);
