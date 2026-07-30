/**
 * Tiny heuristic "on-device" reflection engine.
 * Runs entirely in the browser — no network calls, ever.
 */
import type { Mood } from "./mindvault";

const LEXICON: Record<string, string[]> = {
  anxious: ["anxious", "worried", "nervous", "panic", "stress", "stressed", "overwhelm"],
  tired: ["tired", "exhausted", "drained", "sleep", "burnt"],
  grateful: ["grateful", "thankful", "appreciate", "blessed"],
  hopeful: ["hope", "hopeful", "excited", "looking forward", "optimistic"],
  sad: ["sad", "down", "lonely", "cry", "empty", "hurt"],
  angry: ["angry", "frustrated", "annoyed", "mad", "irritated"],
  calm: ["calm", "peaceful", "relaxed", "steady", "quiet"],
  proud: ["proud", "accomplished", "achieved", "finished", "won"],
  loved: ["love", "friend", "family", "together", "hug"],
  focused: ["focus", "focused", "productive", "deep work", "flow"],
};

export function detectEmotions(text: string): string[] {
  const t = text.toLowerCase();
  const found = Object.entries(LEXICON)
    .filter(([, words]) => words.some((w) => t.includes(w)))
    .map(([emotion]) => emotion);
  return found.length ? found.slice(0, 4) : ["reflective"];
}

export function summarize(text: string): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s/)
    .filter((s) => s.trim().length > 12);
  if (!sentences.length) return text.trim().slice(0, 160);
  const picked = [sentences[0], sentences[Math.floor(sentences.length / 2)], sentences.at(-1)!]
    .filter((s, i, arr) => s && arr.indexOf(s) === i)
    .slice(0, 2);
  return picked.join(" ").trim();
}

const OPENERS = [
  "Thank you for putting that into words.",
  "That took some honesty to write down.",
  "I hear you, and it makes sense you'd feel this way.",
  "It sounds like a lot has been moving through you.",
];

const EMOTION_LINES: Record<string, string> = {
  anxious: "There's a thread of worry running through this — anxiety often shows up when something matters to you.",
  tired: "Your energy sounds low. Rest isn't a reward you earn; it's part of how you keep going.",
  grateful: "There's real gratitude here, and noticing it is a skill you're clearly building.",
  hopeful: "I can feel some hope in this — that's worth holding onto.",
  sad: "There's sadness here, and it deserves space rather than a quick fix.",
  angry: "Frustration usually points at a boundary that got crossed. That's useful information.",
  calm: "There's a steadiness in your words today.",
  proud: "You accomplished something, and letting yourself feel that matters.",
  loved: "Connection shows up throughout this entry.",
  focused: "You sound engaged and present with your work.",
  reflective: "You're sitting with your thoughts rather than rushing past them.",
};

const MOOD_CLOSERS: Record<Mood, string> = {
  great: "What made today work? Naming it makes it repeatable.",
  good: "Small good days add up more than big ones. What supported you today?",
  okay: "Neutral days are still data. Is there one small thing that would nudge tomorrow up?",
  low: "Be gentle with yourself tonight. What is one kind thing you can do for yourself?",
  rough: "Rough days pass, even when they don't feel like they will. Who could you reach out to?",
};

export const SUGGESTED_PROMPTS = [
  "How are you feeling today?",
  "What made you smile today?",
  "What's stressing you lately?",
  "What are you grateful for?",
];

export function reflect(text: string, mood: Mood): string {
  const emotions = detectEmotions(text);
  const opener = OPENERS[text.length % OPENERS.length];
  const middle = emotions
    .map((e) => EMOTION_LINES[e])
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  return `${opener} ${middle} ${MOOD_CLOSERS[mood]}`.replace(/\s+/g, " ").trim();
}

export function reflectionPrompts(text: string): string[] {
  const emotions = detectEmotions(text);
  const base = [
    "What would you tell a friend who wrote this?",
    "Where in your body did you feel this most?",
  ];
  if (emotions.includes("anxious")) base.unshift("What part of this is actually within your control?");
  if (emotions.includes("tired")) base.unshift("What could you take off your plate this week?");
  if (emotions.includes("grateful")) base.unshift("Who could you thank for this?");
  return base.slice(0, 3);
}

export function insight(text: string, mood: Mood): string {
  const words = text.trim().split(/\s+/).length;
  const emotions = detectEmotions(text);
  return `You wrote ${words} words and your dominant tone reads as ${emotions[0]}. Entries logged as "${mood}" tend to be your most honest ones — keep going.`;
}

/** Simulated on-device transcription for the demo recorder. */
const DEMO_TRANSCRIPTS = [
  "Today felt busy but manageable. I got through most of my list and even took a short walk in the afternoon, which helped clear my head. I'm a little tired but mostly okay.",
  "I've been feeling stressed about the deadline coming up. My mind keeps racing at night. I know I'm capable, but the pressure is sitting heavy on my chest.",
  "Had coffee with an old friend today and it made me smile more than I expected. I'm grateful for people who make things feel easy.",
];

export function demoTranscript(seed = Date.now()) {
  return DEMO_TRANSCRIPTS[seed % DEMO_TRANSCRIPTS.length];
}
