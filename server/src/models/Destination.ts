import { Schema, model, InferSchemaType } from "mongoose";

// Seed data lifted from the client's data.js, enriched with a slug, an imageKey
// (the React client maps it to a bundled asset), and USD pricing in integer cents.
const destinationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    distance: { type: String, required: true },
    travel: { type: String, required: true },
    pricePerSeat: { type: Number, required: true, min: 0 }, // integer cents (USD)
    imageKey: { type: String, required: true },
  },
  { timestamps: true }
);

export type DestinationDoc = InferSchemaType<typeof destinationSchema>;
export const Destination = model("Destination", destinationSchema);
