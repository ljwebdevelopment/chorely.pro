export type BuddyStage = 0 | 1 | 2 | 3 | 4;

const stageNames: Record<BuddyStage, string> = {
  0: "a seed",
  1: "a sprout",
  2: "growing strong",
  3: "blooming",
  4: "flourishing"
};

export function buddyStage(weeklyApproved: number): BuddyStage {
  if (weeklyApproved >= 10) return 4;
  if (weeklyApproved >= 6) return 3;
  if (weeklyApproved >= 3) return 2;
  if (weeklyApproved >= 1) return 1;
  return 0;
}

export function buddyStageName(stage: BuddyStage) {
  return stageNames[stage];
}

export function buddyStatusMessage(input: { stage: BuddyStage; wateredToday: boolean; weeklyApproved: number }) {
  if (input.wateredToday) {
    if (input.stage >= 4) return "Sprout is flourishing! This week's chores have it thriving.";
    if (input.stage >= 3) return "Sprout is blooming. Keep the streak going!";
    if (input.stage >= 1) return `Sprout was watered today and is ${stageNames[input.stage]}. Every approved chore helps it grow.`;
    return "Sprout was watered today. Approved chores will help it sprout.";
  }

  if (input.stage === 0) return "Sprout is waiting to be planted. Complete a chore to water it.";
  return `Sprout is ${stageNames[input.stage]}, but it's thirsty today. One chore will water it.`;
}

const motivationalMessages = [
  "Feeling up for some chores? Sprout is thirsty.",
  "Want to earn some cash today?",
  "Your plant could use some water.",
  "A few chores today can grow your reward.",
  "Your chore buddy is waiting on you.",
  "Today's chores are tomorrow's allowance.",
  "Sprout grows a little with every chore you finish."
];

export function dailyMotivationalMessage(date: Date = new Date()) {
  const dayKey = Math.floor(date.getTime() / 86400000);
  return motivationalMessages[dayKey % motivationalMessages.length];
}

export const buddyPotColors = {
  terracotta: { pot: "#B9966D", rim: "#A8845C" },
  sage: { pot: "#8FA98C", rim: "#7C9678" },
  sky: { pot: "#8FA6B9", rim: "#7C93A8" },
  sunny: { pot: "#D4B26A", rim: "#C2A055" }
} as const;

export const buddyBloomColors = {
  gold: { bloom: "#C9973D", center: "#E8C27A" },
  rose: { bloom: "#C97A7A", center: "#E8B5B5" },
  violet: { bloom: "#9A86B5", center: "#C7BBDB" }
} as const;

export const buddyFaces = ["smile", "wink", "none"] as const;

export type BuddyStyle = {
  pot: keyof typeof buddyPotColors;
  bloom: keyof typeof buddyBloomColors;
  face: (typeof buddyFaces)[number];
};

export function normalizeBuddyStyle(value: unknown): BuddyStyle {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const pot = typeof raw.pot === "string" && raw.pot in buddyPotColors ? (raw.pot as BuddyStyle["pot"]) : "terracotta";
  const bloom = typeof raw.bloom === "string" && raw.bloom in buddyBloomColors ? (raw.bloom as BuddyStyle["bloom"]) : "gold";
  const face = typeof raw.face === "string" && buddyFaces.includes(raw.face as BuddyStyle["face"]) ? (raw.face as BuddyStyle["face"]) : "smile";
  return { pot, bloom, face };
}

export function reminderBody(input: { childName: string; requested?: string | null }) {
  const trimmed = (input.requested || "").trim();
  if (trimmed && trimmed.length <= 200) return trimmed;
  return reminderMessages(input.childName)[0];
}

export function reminderMessages(childName: string) {
  return [
    `${childName}, a few chores today can grow your reward.`,
    `${childName}, your chore buddy is waiting on you.`,
    `${childName}, want to earn some cash today? Check your chore list.`,
    `${childName}, your plant could use some water — one chore will do it.`
  ];
}
