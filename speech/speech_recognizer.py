"""
SpeechRecognizer: offline speech-to-text using Faster-Whisper.

The Whisper model is loaded lazily (on first use) and cached for the
lifetime of the `SpeechRecognizer` instance, so constructing one is
cheap and safe to do eagerly at application start-up.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Optional, TypedDict, Union

from .config import DEFAULT_CONFIG, SpeechConfig
from .utils import (
    CorruptedAudioError,
    ModelLoadError,
    TranscriptionError,
    UnsupportedFormatError,
    get_logger,
)

logger = get_logger(__name__)

try:
    from faster_whisper import WhisperModel

    _FASTER_WHISPER_AVAILABLE = True
except ImportError:
    WhisperModel = None  # type: ignore[assignment]
    _FASTER_WHISPER_AVAILABLE = False
    logger.warning("faster-whisper is not installed; transcription will be unavailable.")

_SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm"}


class TranscriptionResult(TypedDict):
    """Structured result returned by `SpeechRecognizer.transcribe*`."""

    text: str
    language: str
    confidence: float


class SpeechRecognizer:
    """Offline, CPU/GPU speech-to-text powered by Faster-Whisper.

    Example:
        recognizer = SpeechRecognizer()
        result = recognizer.transcribe("input.wav")
        print(result["text"], result["language"], result["confidence"])
    """

    def __init__(self, config: Optional[SpeechConfig] = None) -> None:
        self.config = config or DEFAULT_CONFIG
        self._model: Optional["WhisperModel"] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def transcribe(self, audio_path: Union[str, Path]) -> TranscriptionResult:
        """Transcribe an audio file on disk to text.

        Args:
            audio_path: Path to a WAV/MP3/FLAC/M4A/OGG/WebM file.

        Returns:
            {"text": str, "language": str, "confidence": float}

        Raises:
            CorruptedAudioError: if the file is missing or unreadable.
            UnsupportedFormatError: if the file extension is not supported.
            ModelLoadError: if the Whisper model cannot be loaded.
            TranscriptionError: for any other transcription failure.
        """
        path = Path(audio_path)
        if not path.exists():
            raise CorruptedAudioError(f"Audio file does not exist: {path}")
        if path.suffix.lower() not in _SUPPORTED_EXTENSIONS:
            raise UnsupportedFormatError(
                f"Unsupported audio format '{path.suffix}'. "
                f"Supported formats: {sorted(_SUPPORTED_EXTENSIONS)}"
            )

        model = self._get_model()

        try:
            segments, info = model.transcribe(
                str(path),
                language=self.config.language,
                beam_size=self.config.beam_size,
                vad_filter=self.config.vad_filter,
            )
            segments = list(segments)
        except Exception as exc:
            raise TranscriptionError(f"Faster-Whisper failed to transcribe '{path}': {exc}") from exc

        return self._build_result(segments, info, path.name)

    def transcribe_bytes(self, audio_bytes: bytes, suffix: str = ".wav") -> TranscriptionResult:
        """Transcribe raw encoded audio bytes (e.g. output of `AudioRecorder`).

        Args:
            audio_bytes: Encoded audio bytes (WAV strongly recommended,
                since that is what `AudioRecorder.get_audio_bytes()` produces).
            suffix: File extension hint used for the temporary file that is
                created internally (Faster-Whisper reads from a path).

        Returns:
            {"text": str, "language": str, "confidence": float}
        """
        if not audio_bytes:
            raise CorruptedAudioError("Received empty audio byte stream.")
        if suffix.lower() not in _SUPPORTED_EXTENSIONS:
            raise UnsupportedFormatError(f"Unsupported audio format '{suffix}'.")

        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                return self.transcribe(tmp.name)
        except (CorruptedAudioError, UnsupportedFormatError, ModelLoadError, TranscriptionError):
            raise
        except Exception as exc:
            raise CorruptedAudioError(f"Failed to process audio bytes: {exc}") from exc

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_model(self) -> "WhisperModel":
        """Lazily load and cache the Faster-Whisper model."""
        if self._model is not None:
            return self._model
        if not _FASTER_WHISPER_AVAILABLE:
            raise ModelLoadError(
                "faster-whisper is not installed. Run: pip install faster-whisper"
            )
        try:
            logger.info(
                "Loading Faster-Whisper model '%s' (device=%s, compute_type=%s)...",
                self.config.model_size, self.config.device, self.config.compute_type,
            )
            self._model = WhisperModel(
                self.config.model_size,
                device=self.config.device,
                compute_type=self.config.compute_type,
            )
            logger.info("Faster-Whisper model loaded successfully.")
        except Exception as exc:
            raise ModelLoadError(
                f"Failed to load Faster-Whisper model '{self.config.model_size}': {exc}"
            ) from exc
        return self._model

    @staticmethod
    def _build_result(segments, info, source_name: str) -> TranscriptionResult:
        """Combine Whisper's segment list + info object into a flat result dict."""
        text = " ".join(segment.text.strip() for segment in segments).strip()
        language = getattr(info, "language", "unknown") or "unknown"
        confidence = float(getattr(info, "language_probability", 0.0) or 0.0)

        logger.info(
            "Transcription completed for '%s' (language=%s, confidence=%.2f, chars=%d).",
            source_name, language, confidence, len(text),
        )
        return TranscriptionResult(text=text, language=language, confidence=confidence)
