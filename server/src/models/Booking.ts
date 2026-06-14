import { Schema, model, InferSchemaType } from "mongoose";

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "refunded",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const bookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    launch: { type: Schema.Types.ObjectId, ref: "Launch", required: true, index: true },
    seats: { type: Number, required: true, min: 1 },
    passengers: { type: [String], default: [] },
    amount: { type: Number, required: true, min: 0 }, // integer cents (seats * pricePerSeat)
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "pending",
      index: true,
    },
    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String },
    expiresAt: { type: Date }, // when a pending hold lapses
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export type BookingDoc = InferSchemaType<typeof bookingSchema>;
export const Booking = model("Booking", bookingSchema);
