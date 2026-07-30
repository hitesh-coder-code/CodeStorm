"""
Tests for speech.speech_recognizer.SpeechRecognizer.

A fake Faster-Whisper `WhisperModel` is injected via monkeypatch so
these tests run without downloading any real model weights.
"""

import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pytest

from speech import speech_recognizer as speech_recognizer_module
from speech.config import SpeechConfig
from speech.speech_recognizer import SpeechRecognizer
from speech.utils import (
    CorruptedAudioError,
    ModelLoadError,
    UnsupportedFormatError,
)


@dataclass
class _FakeSegment:
    text: str


@dataclass
class _FakeInfo:
    language: str
    language_probability: float


class _FakeWhisperModel:
    """Stand-in for faster_whisper.WhisperModel."""

    def __init__(self, model_size, device, compute_type):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type

    def transcribe(self, path, language, beam_size, vad_filter):
        segments = [_FakeSegment(text=" hello "), _FakeSegment(text="world ")]
        info = _FakeInfo(language="en", language_probability=0.97)
        return segments, info


class _FailingWhisperModel:
    def __init__(self, *args, **kwargs):
        pass

    def transcribe(self, *args, **kwargs):
        raise RuntimeError("simulated decode failure")


def _write_dummy_wav(path: Path, sample_rate: int = 16000) -> None:
    samples = (np.sin(np.linspace(0, 20, sample_rate)) * 1000).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(samples.tobytes())


@pytest.fixture
def wav_file(tmp_path):
    path = tmp_path / "sample.wav"
    _write_dummy_wav(path)
    return path


def test_transcribe_missing_file_raises(tmp_path):
    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path))
    with pytest.raises(CorruptedAudioError):
        recognizer.transcribe(tmp_path / "does_not_exist.wav")


def test_transcribe_unsupported_extension_raises(tmp_path):
    bad_file = tmp_path / "clip.xyz"
    bad_file.write_bytes(b"not audio")
    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path))
    with pytest.raises(UnsupportedFormatError):
        recognizer.transcribe(bad_file)


def test_transcribe_raises_model_load_error_when_faster_whisper_missing(wav_file, tmp_path, monkeypatch):
    monkeypatch.setattr(speech_recognizer_module, "_FASTER_WHISPER_AVAILABLE", False)
    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path))
    with pytest.raises(ModelLoadError):
        recognizer.transcribe(wav_file)


def test_transcribe_happy_path(wav_file, tmp_path, monkeypatch):
    monkeypatch.setattr(speech_recognizer_module, "_FASTER_WHISPER_AVAILABLE", True)
    monkeypatch.setattr(speech_recognizer_module, "WhisperModel", _FakeWhisperModel)

    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path, model_size="tiny"))
    result = recognizer.transcribe(wav_file)

    assert result["text"] == "hello world"
    assert result["language"] == "en"
    assert result["confidence"] == pytest.approx(0.97)


def test_transcribe_bytes_happy_path(wav_file, tmp_path, monkeypatch):
    monkeypatch.setattr(speech_recognizer_module, "_FASTER_WHISPER_AVAILABLE", True)
    monkeypatch.setattr(speech_recognizer_module, "WhisperModel", _FakeWhisperModel)

    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path, model_size="tiny"))
    audio_bytes = wav_file.read_bytes()
    result = recognizer.transcribe_bytes(audio_bytes)

    assert result["text"] == "hello world"


def test_transcribe_bytes_rejects_empty_bytes(tmp_path):
    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path))
    with pytest.raises(CorruptedAudioError):
        recognizer.transcribe_bytes(b"")


def test_model_is_cached_across_calls(wav_file, tmp_path, monkeypatch):
    load_count = {"n": 0}

    class _CountingModel(_FakeWhisperModel):
        def __init__(self, *args, **kwargs):
            load_count["n"] += 1
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(speech_recognizer_module, "_FASTER_WHISPER_AVAILABLE", True)
    monkeypatch.setattr(speech_recognizer_module, "WhisperModel", _CountingModel)

    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path, model_size="tiny"))
    recognizer.transcribe(wav_file)
    recognizer.transcribe(wav_file)

    assert load_count["n"] == 1


def test_transcription_failure_raises_transcription_error(wav_file, tmp_path, monkeypatch):
    from speech.utils import TranscriptionError

    monkeypatch.setattr(speech_recognizer_module, "_FASTER_WHISPER_AVAILABLE", True)
    monkeypatch.setattr(speech_recognizer_module, "WhisperModel", _FailingWhisperModel)

    recognizer = SpeechRecognizer(SpeechConfig(output_directory=tmp_path, model_size="tiny"))
    with pytest.raises(TranscriptionError):
        recognizer.transcribe(wav_file)
