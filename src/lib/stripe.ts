import Stripe from "stripe";
import { getEnv } from "@/lib/env";

export function getStripe() {
  return new Stripe(getEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-05-27.dahlia"
  });
}
