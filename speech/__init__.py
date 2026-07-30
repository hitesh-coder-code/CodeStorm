"""
CodeStorm Speech Module.

An offline-first speech pipeline (recording, VAD, STT, TTS) exposed as
a small set of clean Python classes, independent of any UI. Usable from
a web backend, desktop app, CLI, HTTP API, or mobile bridge alike.

Public API:

    from speech import VoicePipeline
    pipeline = VoicePipeline()
    text = pipeline.listen()
    pipeline.speak("Hello!")

Lower-level components are also exposed directly for callers that need
finer-grained control:

    from speech import AudioRecorder, SpeechRecognizer, SpeechSynthesizer, SpeechConfig

Everything not listed in `__all__` is an implementation detail and may
change without notice.
"""

from .audio_recorder import AudioRecorder
from .config import DEFAULT_CONFIG, SpeechConfig
from .speech_recognizer import SpeechRecognizer, TranscriptionResult
from .speech_synthesizer import SpeechSynthesizer
from .utils import (
    CorruptedAudioError,
    EmptyRecordingError,
    MicrophoneUnavailableError,
    ModelLoadError,
    RecordingTimeoutError,
    SpeechModuleError,
    SynthesisError,
    TranscriptionError,
    UnsupportedFormatError,
)
from .voice_pipeline import VoicePipeline

__all__ = [
    "VoicePipeline",
    "AudioRecorder",
    "SpeechRecognizer",
    "TranscriptionResult",
    "SpeechSynthesizer",
    "SpeechConfig",
    "DEFAULT_CONFIG",
    "SpeechModuleError",
    "MicrophoneUnavailableError",
    "EmptyRecordingError",
    "RecordingTimeoutError",
    "CorruptedAudioError",
    "UnsupportedFormatError",
    "ModelLoadError",
    "TranscriptionError",
    "SynthesisError",
]

__version__ = "1.0.0"
