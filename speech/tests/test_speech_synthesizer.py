"""
Tests for speech.speech_synthesizer.SpeechSynthesizer.

Fake Coqui/gTTS engines are injected via monkeypatch so these tests run
without downloading real TTS models or requiring internet access.
"""

from pathlib import Path

import pytest

from speech import speech_synthesizer as speech_synthesizer_module
from speech.config import SpeechConfig
from speech.speech_synthesizer import SpeechSynthesizer
from speech.utils import SynthesisError


class _FakeCoquiTTS:
    """Stand-in for TTS.api.TTS."""

    def __init__(self, model_name, progress_bar=False):
        self.model_name = model_name

    def tts_to_file(self, text, file_path, speed=None):
        Path(file_path).write_bytes(b"FAKE_WAV_AUDIO")


class _FakeGTTS:
    """Stand-in for gtts.gTTS."""

    def __init__(self, text, lang):
        self.text = text
        self.lang = lang

    def save(self, path):
        Path(path).write_bytes(b"FAKE_MP3_AUDIO")


def _patch_no_engines(monkeypatch):
    monkeypatch.setattr(speech_synthesizer_module, "_COQUI_AVAILABLE", False)
    monkeypatch.setattr(speech_synthesizer_module, "_GTTS_AVAILABLE", False)


def _patch_coqui_available(monkeypatch):
    monkeypatch.setattr(speech_synthesizer_module, "_COQUI_AVAILABLE", True)
    monkeypatch.setattr(speech_synthesizer_module, "CoquiTTS", _FakeCoquiTTS)


def _patch_gtts_available(monkeypatch):
    monkeypatch.setattr(speech_synthesizer_module, "_GTTS_AVAILABLE", True)
    monkeypatch.setattr(speech_synthesizer_module, "gTTS", _FakeGTTS)


def test_raises_when_no_engine_available(monkeypatch, tmp_path):
    _patch_no_engines(monkeypatch)
    with pytest.raises(SynthesisError):
        SpeechSynthesizer(SpeechConfig(output_directory=tmp_path))


def test_falls_back_to_gtts_when_coqui_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(speech_synthesizer_module, "_COQUI_AVAILABLE", False)
    _patch_gtts_available(monkeypatch)

    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path, tts_engine="coqui"))
    assert synth._engine == "gtts"


def test_save_to_file_with_coqui(monkeypatch, tmp_path):
    _patch_coqui_available(monkeypatch)
    _patch_gtts_available(monkeypatch)  # available but should not be used

    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path, tts_engine="coqui"))
    out_path = synth.save_to_file("hello world", tmp_path / "out.wav")

    assert out_path.exists()
    assert out_path.read_bytes() == b"FAKE_WAV_AUDIO"


def test_save_to_file_with_gtts_fallback(monkeypatch, tmp_path):
    monkeypatch.setattr(speech_synthesizer_module, "_COQUI_AVAILABLE", False)
    _patch_gtts_available(monkeypatch)

    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path, tts_engine="coqui"))
    out_path = synth.save_to_file("hello world", tmp_path / "out.wav")

    # gTTS always produces .mp3, regardless of the requested extension.
    assert out_path.suffix == ".mp3"
    assert out_path.exists()
    assert out_path.read_bytes() == b"FAKE_MP3_AUDIO"


def test_save_to_file_rejects_empty_text(monkeypatch, tmp_path):
    _patch_coqui_available(monkeypatch)
    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path))
    with pytest.raises(SynthesisError):
        synth.save_to_file("   ", tmp_path / "out.wav")


def test_speak_with_no_playback_backend_does_not_raise(monkeypatch, tmp_path):
    _patch_coqui_available(monkeypatch)
    monkeypatch.setattr(speech_synthesizer_module, "_PLAYBACK_WAV_AVAILABLE", False)
    monkeypatch.setattr(speech_synthesizer_module, "_PLAYSOUND_AVAILABLE", False)

    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path))
    # Should log an error internally but never raise/crash the caller.
    synth.speak("hello world")


def test_speak_with_empty_text_is_noop(monkeypatch, tmp_path):
    _patch_coqui_available(monkeypatch)
    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path))
    synth.speak("")  # should just log a warning, not raise


def test_stop_does_not_raise_without_playback(monkeypatch, tmp_path):
    _patch_coqui_available(monkeypatch)
    monkeypatch.setattr(speech_synthesizer_module, "_PLAYBACK_WAV_AVAILABLE", False)
    synth = SpeechSynthesizer(SpeechConfig(output_directory=tmp_path))
    synth.stop()
