"""
VoicePipeline: high-level orchestration of the speech module.

This is the primary public entry point the rest of CodeStorm should
use. It wires together `AudioRecorder`, `SpeechRecognizer`, and
`SpeechSynthesizer` into one simple, UI-agnostic API:

    from speech import VoicePipeline

    pipeline = VoicePipeline()
    text = pipeline.listen()
    pipeline.speak("Hello!")

There is no UI code here, and no LLM integration: `_default_response_handler`
is an explicit placeholder that the LLM module will later replace via
`set_response_handler()` (or by passing `response_handler=` at construction).
"""

from __future__ import annotations

from typing import Callable, Optional

from .audio_recorder import AudioRecorder
from .config import DEFAULT_CONFIG, SpeechConfig
from .speech_recognizer import SpeechRecognizer, TranscriptionResult
from .speech_synthesizer import SpeechSynthesizer
from .utils import SpeechModuleError, get_logger

logger = get_logger(__name__)

ResponseHandler = Callable[[str], str]


class VoicePipeline:
    """End-to-end voice interaction: listen -> transcribe -> respond -> speak.

    Each stage (`AudioRecorder`, `SpeechRecognizer`, `SpeechSynthesizer`)
    is independently usable and independently testable; `VoicePipeline`
    simply composes them for convenience and dependency injection.
    """

    def __init__(
        self,
        config: Optional[SpeechConfig] = None,
        recorder: Optional[AudioRecorder] = None,
        recognizer: Optional[SpeechRecognizer] = None,
        synthesizer: Optional[SpeechSynthesizer] = None,
        response_handler: Optional[ResponseHandler] = None,
    ) -> None:
        """Construct a VoicePipeline.

        Args:
            config: Shared `SpeechConfig`; defaults to `DEFAULT_CONFIG`.
            recorder, recognizer, synthesizer: Inject custom instances
                (e.g. for testing) rather than building from `config`.
            response_handler: `Callable(text) -> str` used to generate a
                reply to recognized speech. Defaults to a placeholder so
                this module has zero dependency on the LLM module. Wire
                in the real LLM later via `set_response_handler()`.
        """
        self.config = config or DEFAULT_CONFIG
        self.recorder = recorder or AudioRecorder(self.config)
        self.recognizer = recognizer or SpeechRecognizer(self.config)
        self.synthesizer = synthesizer or SpeechSynthesizer(self.config)
        self._response_handler: ResponseHandler = response_handler or self._default_response_handler

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def listen(self) -> str:
        """Record from the microphone until silence, then transcribe.

        Never raises for expected failure modes (no mic, silence-only
        recording, model errors) — these are logged and an empty string
        is returned so callers can treat "" as "nothing was understood".

        Returns:
            The recognized text, or "" if listening/transcription failed.
        """
        try:
            audio_bytes = self.recorder.record_until_silence()
        except SpeechModuleError as exc:
            logger.error("Listening failed: %s", exc)
            return ""

        try:
            result = self.recognizer.transcribe_bytes(audio_bytes)
        except SpeechModuleError as exc:
            logger.error("Transcription failed: %s", exc)
            return ""

        return result["text"]

    def listen_full(self) -> Optional[TranscriptionResult]:
        """Like `listen`, but returns the full result dict (or None on failure).

        Useful when callers need `language`/`confidence` in addition to text.
        """
        try:
            audio_bytes = self.recorder.record_until_silence()
            return self.recognizer.transcribe_bytes(audio_bytes)
        except SpeechModuleError as exc:
            logger.error("listen_full failed: %s", exc)
            return None

    def speak(self, text: str, blocking: bool = True) -> None:
        """Synthesize and play `text` aloud. Never raises to the caller."""
        try:
            self.synthesizer.speak(text, blocking=blocking)
        except SpeechModuleError as exc:
            logger.error("Speaking failed: %s", exc)

    def converse_once(self) -> str:
        """Run one full voice-interaction turn: listen, respond, speak.

        Returns:
            The response text that was spoken ("" if nothing was heard).
        """
        heard_text = self.listen()
        if not heard_text:
            logger.info("Nothing recognized; skipping response generation.")
            return ""

        response = self._response_handler(heard_text)
        self.speak(response)
        return response

    def set_response_handler(self, handler: ResponseHandler) -> None:
        """Register a custom `callable(text) -> str`, e.g. the LLM module's entry point.

        Example (future integration):
            from llm.engine import generate_reply
            pipeline.set_response_handler(generate_reply)
        """
        self._response_handler = handler

    # ------------------------------------------------------------------
    # Placeholder response — intentionally NOT an LLM.
    # Replace via `set_response_handler()` or the `response_handler` constructor arg.
    # ------------------------------------------------------------------

    @staticmethod
    def _default_response_handler(_text: str) -> str:
        """Placeholder AI response used until the LLM module is wired in."""
        return "This is a placeholder response."
