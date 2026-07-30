import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FileText,
  Mic,
  Pause,
  Play,
  Save,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import {
  MOODS,
  useEntries,
  type Mood,
} from "@/lib/mindvault";

import {
  detectEmotions,
  reflect,
  summarize,
} from "@/lib/on-device-ai";

import {
  generateAIReflection,
  transcribeAudio,
} from "@/lib/api";

import {
  Button,
} from "@/components/ui/button";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  PrivacyBadges,
} from "@/components/privacy";

import { toast } from "sonner";


export const Route = createFileRoute(
  "/app/voice",
)({
  head: () => ({
    meta: [
      {
        title:
          "Voice Notes — MindVault",
      },
      {
        name: "description",
        content:
          "Record and transcribe a private voice journal.",
      },
    ],
  }),
  component: VoiceScreen,
});


const BARS = 28;


type RecordingState =
  | "idle"
  | "recording"
  | "paused"
  | "transcribing"
  | "done";


function chooseMimeType(): string {
  const possibleTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return (
    possibleTypes.find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? ""
  );
}


function VoiceScreen() {
  const navigate = useNavigate();
  const { add } = useEntries();

  const [state, setState] =
    useState<RecordingState>("idle");

  const [seconds, setSeconds] =
    useState(0);

  const [levels, setLevels] =
    useState<number[]>(
      Array(BARS).fill(0.2),
    );

  const [transcript, setTranscript] =
    useState("");

  const [mood, setMood] =
    useState<Mood>("okay");

  const [reflection, setReflection] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  const timerRef =
    useRef<
      ReturnType<typeof setInterval> | null
    >(null);


  useEffect(() => {
    if (state !== "recording") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds(
        (previous) => previous + 1,
      );

      setLevels(
        Array.from(
          { length: BARS },
          () =>
            0.15 +
            Math.random() * 0.85,
        ),
      );
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);


  useEffect(() => {
    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );
    };
  }, []);


  const formattedTime =
    `${String(
      Math.floor(seconds / 60),
    ).padStart(2, "0")}:` +
    `${String(
      seconds % 60,
    ).padStart(2, "0")}`;


  async function transcribeRecording(
    audioBlob: Blob,
  ) {
    setState("transcribing");

    try {
      const result =
        await transcribeAudio(
          audioBlob,
        );

      if (!result.text.trim()) {
        toast.error(
          "No speech was detected.",
        );

        setState("idle");
        return;
      }

      setTranscript(result.text);
      setSummary(
        summarize(result.text),
      );

      const aiResponse =
  await generateAIReflection(
    result.text,
    mood,
  );

setReflection(
  aiResponse.reflection,
);

      setState("done");

      toast.success(
        "Speech transcribed",
        {
          description:
            `Language: ${
              result.language
            }`,
        },
      );
    } catch (error) {
      setState("idle");

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to transcribe audio.",
      );
    }
  }


  async function startRecording() {
    if (
      !navigator.mediaDevices ||
      !window.MediaRecorder
    ) {
      toast.error(
        "Audio recording is not supported by this browser.",
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType =
        chooseMimeType();

      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              { mimeType },
            )
          : new MediaRecorder(
              stream,
            );

      recorderRef.current = recorder;

      recorder.ondataavailable = (
        event,
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data,
          );
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type:
              recorder.mimeType ||
              "audio/webm",
          },
        );

        stream
          .getTracks()
          .forEach((track) =>
            track.stop(),
          );

        streamRef.current = null;

        void transcribeRecording(
          audioBlob,
        );
      };

      recorder.start(250);

      setSeconds(0);
      setTranscript("");
      setSummary("");
      setReflection("");
      setState("recording");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Microphone permission was denied.",
      );
    }
  }


  function pauseOrResume() {
    const recorder =
      recorderRef.current;

    if (!recorder) {
      return;
    }

    if (
      recorder.state === "recording"
    ) {
      recorder.pause();
      setState("paused");
      return;
    }

    if (
      recorder.state === "paused"
    ) {
      recorder.resume();
      setState("recording");
    }
  }


  function stopRecording() {
    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }
  }


  function cancelRecording() {
    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.onstop = null;
      recorder.stop();
    }

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      );

    recorderRef.current = null;
    streamRef.current = null;
    audioChunksRef.current = [];

    setState("idle");
    setSeconds(0);
    setTranscript("");
    setReflection("");
    setSummary("");
  }


  async function save() {
    if (!transcript.trim()) {
      toast.error(
        "There is no transcript to save.",
      );
      return;
    }

    try {
      const entry = await add({
        title:
          transcript
            .trim()
            .split(/[.!?]/)[0]
            .slice(0, 60) ||
          "Voice note",
        body: transcript.trim(),
        mood,
        source: "voice",
        emotions:
          detectEmotions(
            transcript,
          ),
        summary:
          summary ||
          summarize(
            transcript,
          ),
        reflection:
          reflection ||
          reflect(
            transcript,
            mood,
          ),
        durationSec: seconds,
      });

      toast.success(
        "Voice journal saved",
      );

      await navigate({
        to: "/app/entry/$id",
        params: {
          id: entry.id,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save entry.",
      );
    }
  }


  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">
          Voice Journaling
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Record in your browser and transcribe
          with your local Whisper backend.
        </p>
      </div>

      <section className="glass relative overflow-hidden rounded-[2rem] px-6 py-10 text-center">
        <div className="relative mx-auto grid size-40 place-items-center">
          {state === "recording" && (
            <>
              <span
                className="brand-surface absolute inset-0 animate-breathe rounded-full opacity-30"
                aria-hidden
              />

              <span
                className="brand-surface absolute inset-4 animate-breathe rounded-full opacity-40"
                style={{
                  animationDelay:
                    "0.6s",
                }}
                aria-hidden
              />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              if (state === "idle") {
                void startRecording();
              } else if (
                state === "recording" ||
                state === "paused"
              ) {
                pauseOrResume();
              }
            }}
            disabled={
              state === "transcribing" ||
              state === "done"
            }
            aria-label={
              state === "recording"
                ? "Pause recording"
                : state === "paused"
                  ? "Resume recording"
                  : "Start recording"
            }
            className="brand-surface relative grid size-24 place-items-center rounded-full shadow-glow transition-transform duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {state === "recording" ? (
              <Pause
                className="size-9"
                aria-hidden
              />
            ) : state === "paused" ? (
              <Play
                className="size-9"
                aria-hidden
              />
            ) : (
              <Mic
                className="size-9"
                aria-hidden
              />
            )}
          </button>
        </div>

        <p className="mt-6 font-mono text-3xl tabular-nums">
          {formattedTime}
        </p>

        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {state === "recording"
            ? "Recording"
            : state === "paused"
              ? "Paused"
              : state ===
                  "transcribing"
                ? "Transcribing"
                : state === "done"
                  ? "Finished"
                  : "Ready"}
        </p>

        <div
          className="mt-6 flex h-16 items-end justify-center gap-1"
          aria-hidden
        >
          {levels.map(
            (level, index) => (
              <span
                key={index}
                className="w-1.5 rounded-full bg-primary/70 transition-all duration-150"
                style={{
                  height:
                    `${
                      (
                        state ===
                        "recording"
                          ? level
                          : 0.15
                      ) * 100
                    }%`,
                }}
              />
            ),
          )}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button
            onClick={
              stopRecording
            }
            disabled={
              state !== "recording" &&
              state !== "paused"
            }
            className="rounded-full"
          >
            <Square
              className="size-4"
              aria-hidden
            />
            Stop
          </Button>

          <Button
            variant="outline"
            className="rounded-full bg-transparent"
            onClick={pauseOrResume}
            disabled={
              state !== "recording" &&
              state !== "paused"
            }
          >
            {state === "paused" ? (
              <Play
                className="size-4"
                aria-hidden
              />
            ) : (
              <Pause
                className="size-4"
                aria-hidden
              />
            )}
            {state === "paused"
              ? "Resume"
              : "Pause"}
          </Button>

          <Button
            variant="ghost"
            className="rounded-full"
            onClick={
              cancelRecording
            }
          >
            <X
              className="size-4"
              aria-hidden
            />
            Cancel
          </Button>
        </div>
      </section>

      {state === "transcribing" && (
        <section className="glass animate-rise space-y-3 rounded-3xl p-6">
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />

          <p className="text-sm text-muted-foreground">
            Transcribing with local
            Faster-Whisper. The first request
            may take longer while the model
            loads.
          </p>
        </section>
      )}

      {state === "done" && (
        <section className="glass animate-rise space-y-4 rounded-3xl p-6">
          <h2 className="text-lg font-semibold">
            Transcription
          </h2>

          <Textarea
            value={transcript}
            onChange={(event) =>
              setTranscript(
                event.target.value,
              )
            }
            rows={7}
            aria-label="Transcription"
            className="rounded-2xl text-[15px] leading-relaxed"
          />

          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              How did that feel?
            </p>

            <div className="flex flex-wrap gap-2">
              {MOODS.map(
                (moodOption) => (
                  <button
                    type="button"
                    key={
                      moodOption.id
                    }
                    onClick={() =>
                      setMood(
                        moodOption.id,
                      )
                    }
                    aria-pressed={
                      mood ===
                      moodOption.id
                    }
                    className={`rounded-2xl px-3.5 py-2 text-sm transition-all ${
                      mood ===
                      moodOption.id
                        ? "brand-surface shadow-glow"
                        : "glass hover:-translate-y-0.5"
                    }`}
                  >
                    <span aria-hidden>
                      {
                        moodOption.emoji
                      }
                    </span>{" "}
                    {moodOption.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {summary && (
            <div className="glass rounded-2xl p-4 text-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Summary
              </p>
              {summary}
            </div>
          )}

          {reflection && (
            <div className="glass rounded-2xl p-4 text-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Reflection
              </p>
              {reflection}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={save}
              className="rounded-full"
            >
              <Save
                className="size-4"
                aria-hidden
              />
              Save Entry
            </Button>

            <Button
              variant="outline"
              className="rounded-full bg-transparent"
              onClick={() =>
                setReflection(
                  reflect(
                    transcript,
                    mood,
                  ),
                )
              }
            >
              <Sparkles
                className="size-4"
                aria-hidden
              />
              Generate Reflection
            </Button>

            <Button
              variant="outline"
              className="rounded-full bg-transparent"
              onClick={() =>
                setSummary(
                  summarize(
                    transcript,
                  ),
                )
              }
            >
              <FileText
                className="size-4"
                aria-hidden
              />
              Summarize
            </Button>
          </div>
        </section>
      )}

      <PrivacyBadges
        className="justify-center"
      />
    </div>
  );
}