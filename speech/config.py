"""
Configuration for the CodeStorm Speech module.

Centralizes every tunable constant used across the speech pipeline so
no magic numbers appear anywhere else in the codebase. Values can be
overridden via environment variables (useful for Docker/CI) or by
constructing a custom `SpeechConfig` instance and passing it into any
component's constructor.

Example:
    from speech.config import SpeechConfig

    custom_config = SpeechConfig(model_size="base", silence_timeout=2.0)
    recognizer = SpeechRecognizer(config=custom_config)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Optional

WhisperDevice = Literal["cpu", "cuda", "auto"]
ComputeType = Literal["int8", "int8_float16", "float16", "float32"]
TTSEngine = Literal["coqui", "gtts"]


def _env_str(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _env_int(key: str, default: int) -> int:
    val = os.environ.get(key)
    return int(val) if val is not None else default


def _env_float(key: str, default: float) -> float:
    val = os.environ.get(key)
    return float(val) if val is not None else default


def _env_bool(key: str, default: bool) -> bool:
    val = os.environ.get(key)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class SpeechConfig:
    """Immutable configuration for the entire speech pipeline.

    Instantiate a custom object and pass it to `AudioRecorder`,
    `SpeechRecognizer`, `SpeechSynthesizer`, or `VoicePipeline` to
    override any default. All components accept the same config type,
    so a single instance can be shared across the whole pipeline.
    """

    # --- Audio recording -------------------------------------------------
    sample_rate: int = field(default_factory=lambda: _env_int("CODESTORM_SAMPLE_RATE", 16000))
    channels: int = 1  # mono is required by Whisper and keeps files small
    dtype: str = "int16"
    frame_duration_ms: int = 30  # webrtcvad only accepts 10, 20, or 30 ms
    silence_timeout: float = field(default_factory=lambda: _env_float("CODESTORM_SILENCE_TIMEOUT", 1.5))
    max_recording_seconds: float = field(default_factory=lambda: _env_float("CODESTORM_MAX_RECORD_SECONDS", 30.0))
    min_recording_seconds: float = 0.3
    silence_rms_threshold: float = field(default_factory=lambda: _env_float("CODESTORM_SILENCE_RMS", 250.0))
    use_webrtcvad: bool = field(default_factory=lambda: _env_bool("CODESTORM_USE_WEBRTCVAD", True))
    vad_aggressiveness: int = 2  # webrtcvad range: 0 (lenient) - 3 (aggressive)

    # --- Speech-to-text (Faster-Whisper) ---------------------------------
    model_size: str = field(default_factory=lambda: _env_str("CODESTORM_MODEL_SIZE", "small"))
    device: WhisperDevice = field(default_factory=lambda: _env_str("CODESTORM_DEVICE", "auto"))
    compute_type: ComputeType = field(default_factory=lambda: _env_str("CODESTORM_COMPUTE_TYPE", "int8"))
    language: Optional[str] = field(default_factory=lambda: os.environ.get("CODESTORM_LANGUAGE") or None)
    beam_size: int = 5
    vad_filter: bool = True  # Faster-Whisper's own internal VAD filter

    # --- Text-to-speech ----------------------------------------------------
    tts_engine: TTSEngine = field(default_factory=lambda: _env_str("CODESTORM_TTS_ENGINE", "coqui"))
    tts_voice: str = field(
        default_factory=lambda: _env_str("CODESTORM_TTS_VOICE", "tts_models/en/ljspeech/tacotron2-DDC")
    )
    tts_speed: float = field(default_factory=lambda: _env_float("CODESTORM_TTS_SPEED", 1.0))
    tts_language: str = field(default_factory=lambda: _env_str("CODESTORM_TTS_LANGUAGE", "en"))

    # --- Filesystem --------------------------------------------------------
    output_directory: Path = field(
        default_factory=lambda: Path(_env_str("CODESTORM_OUTPUT_DIR", "speech_output"))
    )

    def __post_init__(self) -> None:
        # Ensure the output directory exists up front so downstream code
        # never has to special-case "directory missing" errors.
        self.output_directory.mkdir(parents=True, exist_ok=True)


# A ready-to-use default instance. Import and use directly for the common
# case; construct a custom `SpeechConfig(...)` when you need overrides.
DEFAULT_CONFIG = SpeechConfig()
