"""
Shared utilities for the CodeStorm speech module: a custom exception
hierarchy, standardized logging setup, and small stateless audio
helpers reused by more than one component (kept here to avoid
duplicated logic).
"""

from __future__ import annotations

import io
import logging
import wave
from pathlib import Path
from typing import Tuple, Union

import numpy as np

# ---------------------------------------------------------------------------
# Exception hierarchy
#
# Every error raised by this package is a SpeechModuleError subclass, so
# callers in other CodeStorm modules can catch broadly (`except
# SpeechModuleError`) or narrowly (`except MicrophoneUnavailableError`).
# ---------------------------------------------------------------------------


class SpeechModuleError(Exception):
    """Base exception for all speech-module errors."""


class MicrophoneUnavailableError(SpeechModuleError):
    """No usable input audio device could be found or opened."""


class EmptyRecordingError(SpeechModuleError):
    """A recording contained no meaningful audio (silence only / too short)."""


class RecordingTimeoutError(SpeechModuleError):
    """Recording exceeded the configured maximum duration with no speech."""


class CorruptedAudioError(SpeechModuleError):
    """Audio data could not be decoded or is otherwise invalid."""


class UnsupportedFormatError(SpeechModuleError):
    """An audio file or byte stream uses an unsupported format/extension."""


class ModelLoadError(SpeechModuleError):
    """A required ML model (STT or TTS) could not be loaded."""


class TranscriptionError(SpeechModuleError):
    """Speech-to-text transcription failed for a reason other than the above."""


class SynthesisError(SpeechModuleError):
    """Text-to-speech synthesis or playback failed."""


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger, attaching a handler only once per name.

    Using this instead of `logging.getLogger` directly everywhere avoids
    duplicate log lines when a module is imported more than once, and
    keeps a single consistent log format across the whole package.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


# ---------------------------------------------------------------------------
# Audio helpers
# ---------------------------------------------------------------------------


def rms(samples: np.ndarray) -> float:
    """Compute the root-mean-square amplitude of an int16-range audio array.

    Used as the lightweight, dependency-free fallback for voice-activity
    detection when `webrtcvad` is unavailable or fails on a given frame.
    """
    if samples.size == 0:
        return 0.0
    data = samples.astype(np.float64)
    return float(np.sqrt(np.mean(np.square(data))))


def pcm16_to_wav_bytes(pcm_data: bytes, sample_rate: int, channels: int = 1) -> bytes:
    """Wrap raw little-endian PCM16 bytes in an in-memory WAV container."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(2)  # int16 => 2 bytes/sample
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return buffer.getvalue()


def wav_bytes_to_pcm16(wav_bytes: bytes) -> Tuple[bytes, int, int]:
    """Extract raw PCM frames, sample rate, and channel count from WAV bytes.

    Raises:
        CorruptedAudioError: if the bytes are not a valid WAV stream.
    """
    try:
        buffer = io.BytesIO(wav_bytes)
        with wave.open(buffer, "rb") as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            return frames, wav_file.getframerate(), wav_file.getnchannels()
    except (wave.Error, EOFError) as exc:
        raise CorruptedAudioError(f"Unable to parse WAV audio: {exc}") from exc


def ensure_parent_dir(path: Union[str, Path]) -> Path:
    """Ensure the parent directory of `path` exists; return `path` as a Path."""
    resolved = Path(path)
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return resolved
