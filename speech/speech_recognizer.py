"""
SpeechRecognizer: offline speech-to-text using Faster-Whisper.

The Whisper model is loaded lazily on first use and cached for the
lifetime of the SpeechRecognizer instance.
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

    logger.warning(
        "faster-whisper is not installed; "
        "transcription will be unavailable."
    )


_SUPPORTED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".m4a",
    ".ogg",
    ".webm",
}


class TranscriptionResult(TypedDict):
    """Structured result returned by SpeechRecognizer."""

    text: str
    language: str
    confidence: float


class SpeechRecognizer:
    """Offline speech-to-text powered by Faster-Whisper."""

    def __init__(
        self,
        config: Optional[SpeechConfig] = None,
    ) -> None:
        self.config = config or DEFAULT_CONFIG
        self._model: Optional["WhisperModel"] = None

    def transcribe(
        self,
        audio_path: Union[str, Path],
    ) -> TranscriptionResult:
        """Transcribe an audio file stored on disk."""

        path = Path(audio_path)

        if not path.exists():
            raise CorruptedAudioError(
                f"Audio file does not exist: {path}"
            )

        if not path.is_file():
            raise CorruptedAudioError(
                f"Audio path is not a file: {path}"
            )

        suffix = path.suffix.lower()

        if suffix not in _SUPPORTED_EXTENSIONS:
            raise UnsupportedFormatError(
                f"Unsupported audio format '{suffix}'. "
                f"Supported formats: "
                f"{sorted(_SUPPORTED_EXTENSIONS)}"
            )

        model = self._get_model()

        try:
            segments, info = model.transcribe(
                str(path),
                language=self.config.language,
                beam_size=self.config.beam_size,
                vad_filter=self.config.vad_filter,
            )

            segment_list = list(segments)

        except Exception as exc:
            raise TranscriptionError(
                f"Faster-Whisper failed to transcribe "
                f"'{path}': {exc}"
            ) from exc

        return self._build_result(
            segment_list,
            info,
            path.name,
        )

    def transcribe_bytes(
        self,
        audio_bytes: bytes,
        suffix: str = ".wav",
    ) -> TranscriptionResult:
        """Transcribe encoded audio bytes using a temporary file.

        On Windows, the temporary file must be closed before
        Faster-Whisper attempts to open it.
        """

        if not audio_bytes:
            raise CorruptedAudioError(
                "Received an empty audio byte stream."
            )

        normalized_suffix = suffix.lower().strip()

        if not normalized_suffix.startswith("."):
            normalized_suffix = (
                f".{normalized_suffix}"
            )

        if normalized_suffix not in _SUPPORTED_EXTENSIONS:
            raise UnsupportedFormatError(
                f"Unsupported audio format "
                f"'{normalized_suffix}'. "
                f"Supported formats: "
                f"{sorted(_SUPPORTED_EXTENSIONS)}"
            )

        temporary_path: Path | None = None

        try:
            with tempfile.NamedTemporaryFile(
                suffix=normalized_suffix,
                delete=False,
            ) as temporary_file:
                temporary_file.write(audio_bytes)
                temporary_file.flush()

                temporary_path = Path(
                    temporary_file.name
                )

            # The file is closed here, so Windows allows
            # Faster-Whisper to open and read it.
            return self.transcribe(
                temporary_path
            )

        except (
            CorruptedAudioError,
            UnsupportedFormatError,
            ModelLoadError,
            TranscriptionError,
        ):
            raise

        except Exception as exc:
            raise CorruptedAudioError(
                f"Failed to process audio bytes: {exc}"
            ) from exc

        finally:
            if (
                temporary_path is not None
                and temporary_path.exists()
            ):
                try:
                    temporary_path.unlink()
                except OSError:
                    logger.warning(
                        "Could not delete temporary "
                        "audio file: %s",
                        temporary_path,
                    )

    def _get_model(self) -> "WhisperModel":
        """Lazily load and cache the Faster-Whisper model."""

        if self._model is not None:
            return self._model

        if not _FASTER_WHISPER_AVAILABLE:
            raise ModelLoadError(
                "faster-whisper is not installed. "
                "Run: pip install faster-whisper"
            )

        try:
            logger.info(
                "Loading Faster-Whisper model '%s' "
                "(device=%s, compute_type=%s)...",
                self.config.model_size,
                self.config.device,
                self.config.compute_type,
            )

            self._model = WhisperModel(
                self.config.model_size,
                device=self.config.device,
                compute_type=self.config.compute_type,
            )

            logger.info(
                "Faster-Whisper model loaded successfully."
            )

        except Exception as exc:
            raise ModelLoadError(
                f"Failed to load Faster-Whisper model "
                f"'{self.config.model_size}': {exc}"
            ) from exc

        return self._model

    @staticmethod
    def _build_result(
        segments,
        info,
        source_name: str,
    ) -> TranscriptionResult:
        """Convert Whisper segments into one result dictionary."""

        text = " ".join(
            segment.text.strip()
            for segment in segments
            if segment.text.strip()
        ).strip()

        language = (
            getattr(
                info,
                "language",
                "unknown",
            )
            or "unknown"
        )

        confidence = float(
            getattr(
                info,
                "language_probability",
                0.0,
            )
            or 0.0
        )

        logger.info(
            "Transcription completed for '%s' "
            "(language=%s, confidence=%.2f, chars=%d).",
            source_name,
            language,
            confidence,
            len(text),
        )

        return {
            "text": text,
            "language": language,
            "confidence": confidence,
        }