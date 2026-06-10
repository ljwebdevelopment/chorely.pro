import type { ChoreScheduleFrequency, SharedCompletionMode } from "@/lib/chore-domain";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "none";

export type ScheduleFrequency = ChoreScheduleFrequency;

export type Child = {
  id: string;
  household_id: string;
  name: string;
  avatar_url: string | null;
  archived_at: string | null;
  created_at: string;
};

export type Chore = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  reward_cents: number;
  frequency: ScheduleFrequency;
  custom_schedule: string | null;
  shared_completion_mode: SharedCompletionMode;
  split_payment_enabled: boolean;
  active: boolean;
  created_at: string;
};
