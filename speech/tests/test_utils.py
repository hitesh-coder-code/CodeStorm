"""Tests for speech.utils helpers."""

import numpy as np
import pytest

from speech.utils import (
    CorruptedAudioError,
    ensure_parent_dir,
    pcm16_to_wav_bytes,
    rms,
    wav_bytes_to_pcm16,
)


def test_rms_of_silence_is_zero():
    silence = np.zeros(1000, dtype=np.int16)
    assert rms(silence) == 0.0


def test_rms_of_empty_array_is_zero():
    assert rms(np.array([], dtype=np.int16)) == 0.0


def test_rms_of_loud_signal_is_positive():
    loud = np.full(1000, 20000, dtype=np.int16)
    assert rms(loud) > 1000


def test_pcm_wav_roundtrip():
    original_samples = np.array([0, 100, -100, 32767, -32768], dtype=np.int16)
    wav_bytes = pcm16_to_wav_bytes(original_samples.tobytes(), sample_rate=16000, channels=1)

    frames, sample_rate, channels = wav_bytes_to_pcm16(wav_bytes)

    assert sample_rate == 16000
    assert channels == 1
    recovered = np.frombuffer(frames, dtype=np.int16)
    assert np.array_equal(recovered, original_samples)


def test_wav_bytes_to_pcm16_rejects_garbage():
    with pytest.raises(CorruptedAudioError):
        wav_bytes_to_pcm16(b"this is not a wav file")


def test_ensure_parent_dir_creates_missing_directories(tmp_path):
    target = tmp_path / "a" / "b" / "c" / "file.wav"
    assert not target.parent.exists()
    result = ensure_parent_dir(target)
    assert target.parent.exists()
    assert result == target
