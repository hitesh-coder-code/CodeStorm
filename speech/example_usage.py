"""
Example usage of the CodeStorm Speech module.

Run directly for a quick smoke test:

    python -m speech.example_usage --mode pipeline   # full mic -> STT -> TTS loop
    python -m speech.example_usage --mode file        # transcribe/synthesize to files only (no mic needed)

This file is illustrative only — it is NOT part of the module's public
API and other CodeStorm components should import from `speech`
directly, e.g.:

    from speech import VoicePipeline
"""

from __future__ import annotations

import argparse
import sys

from speech import (
    AudioRecorder,
    SpeechConfig,
    SpeechModuleError,
    SpeechRecognizer,
    SpeechSynthesizer,
    VoicePipeline,
)


def demo_pipeline_conversation() -> None:
    """The simplest possible integration: one microphone -> speaker turn."""
    print("Initializing VoicePipeline (this loads the STT/TTS models)...")
    pipeline = VoicePipeline()

    print("\nSpeak now — recording will stop automatically after you go quiet.")
    text = pipeline.listen()

    if not text:
        print("Didn't catch anything. Try again, and check your microphone.")
        return

    print(f"You said: {text!r}")

    # In the real assistant, the LLM module will replace this line via:
    #     pipeline.set_response_handler(llm_module.generate_reply)
    response = "This is a placeholder response."
    print(f"Assistant: {response}")
    pipeline.speak(response)


def demo_continuous_loop() -> None:
    """A basic 'press Ctrl+C to quit' voice-assistant loop."""
    pipeline = VoicePipeline()
    print("Listening continuously. Press Ctrl+C to stop.\n")
    try:
        while True:
            response = pipeline.converse_once()
            if response:
                print(f"Assistant said: {response}")
    except KeyboardInterrupt:
        print("\nStopped.")


def demo_llm_integration_pattern() -> None:
    """Shows how the LLM module will later plug into VoicePipeline."""

    def fake_llm_response(user_text: str) -> str:
        # Replace this with `llm.engine.generate_reply` (or similar) once
        # the LLM module exists. VoicePipeline doesn't care what's inside.
        return f"(pretend-LLM) I heard you say: {user_text}"

    pipeline = VoicePipeline(response_handler=fake_llm_response)
    text = pipeline.listen()
    if text:
        pipeline.converse_once()  # uses fake_llm_response internally


def demo_file_based_workflow(config: SpeechConfig) -> None:
    """No-microphone workflow: useful for servers/CI or headless demos."""
    synthesizer = SpeechSynthesizer(config)
    recognizer = SpeechRecognizer(config)

    sample_text = "Hello from CodeStorm. This audio was generated offline."
    wav_path = config.output_directory / "demo_output.wav"

    print(f"Synthesizing speech to {wav_path} ...")
    written_path = synthesizer.save_to_file(sample_text, wav_path)
    print(f"Wrote: {written_path}")

    print("Transcribing it back to verify the round trip...")
    result = recognizer.transcribe(written_path)
    print(f"Recognized text: {result['text']!r}")
    print(f"Detected language: {result['language']} (confidence={result['confidence']:.2f})")


def demo_manual_recording_control() -> None:
    """Shows the low-level AudioRecorder API for callers needing finer control."""
    recorder = AudioRecorder()
    recorder.start_recording()
    print("Recording for up to the configured max duration or until silence...")
    input("Press Enter to stop manually...\n")
    recorder.stop_recording()
    path = recorder.save_audio(recorder.config.output_directory / "manual_recording.wav")
    print(f"Saved manual recording to {path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="CodeStorm speech module examples")
    parser.add_argument(
        "--mode",
        choices=["pipeline", "loop", "llm-pattern", "file", "manual"],
        default="file",
        help="Which example to run (default: 'file', which needs no microphone).",
    )
    args = parser.parse_args()

    config = SpeechConfig()

    try:
        if args.mode == "pipeline":
            demo_pipeline_conversation()
        elif args.mode == "loop":
            demo_continuous_loop()
        elif args.mode == "llm-pattern":
            demo_llm_integration_pattern()
        elif args.mode == "file":
            demo_file_based_workflow(config)
        elif args.mode == "manual":
            demo_manual_recording_control()
    except SpeechModuleError as exc:
        print(f"Speech module error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
