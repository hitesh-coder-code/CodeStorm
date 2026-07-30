"""Tests for speech.config.SpeechConfig."""

import shutil

from speech.config import DEFAULT_CONFIG, SpeechConfig


def test_default_config_has_sane_values():
    cfg = SpeechConfig()
    assert cfg.sample_rate == 16000
    assert cfg.channels == 1
    assert cfg.silence_timeout > 0
    assert cfg.max_recording_seconds > cfg.min_recording_seconds
    assert cfg.model_size
    assert cfg.tts_engine in {"coqui", "gtts"}


def test_config_creates_output_directory(tmp_path):
    target = tmp_path / "nested" / "speech_out"
    assert not target.exists()
    cfg = SpeechConfig(output_directory=target)
    assert target.exists()
    assert cfg.output_directory == target


def test_config_is_immutable():
    cfg = SpeechConfig()
    try:
        cfg.sample_rate = 8000  # type: ignore[misc]
        assert False, "Expected FrozenInstanceError"
    except Exception:
        pass  # dataclasses.FrozenInstanceError subclasses AttributeError


def test_env_var_override(monkeypatch, tmp_path):
    monkeypatch.setenv("CODESTORM_SAMPLE_RATE", "22050")
    monkeypatch.setenv("CODESTORM_MODEL_SIZE", "tiny")
    monkeypatch.setenv("CODESTORM_OUTPUT_DIR", str(tmp_path / "env_out"))
    cfg = SpeechConfig()
    assert cfg.sample_rate == 22050
    assert cfg.model_size == "tiny"
    assert cfg.output_directory == tmp_path / "env_out"


def test_default_config_singleton_usable():
    # DEFAULT_CONFIG should be importable and already have its directory created.
    assert DEFAULT_CONFIG.output_directory.exists()
    shutil.rmtree(DEFAULT_CONFIG.output_directory, ignore_errors=True)
