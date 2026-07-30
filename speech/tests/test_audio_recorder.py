"""
Tests for speech.audio_recorder.AudioRecorder.

No real microphone or PortAudio installation is required: a fake
`InputStream` is injected in place of `sounddevice.InputStream` to
simulate a live audio callback on a background thread.
"""

import threading
import time
import wave
from io import BytesIO

import numpy as np
import pytest

from speech import audio_recorder as audio_recorder_module
from speech.audio_recorder import AudioRecorder
from speech.config import SpeechConfig
from speech.utils import EmptyRecordingError, MicrophoneUnavailableError, RecordingTimeoutError


class _FakeInputStream:
    """Simulates sounddevice.InputStream by invoking the callback on a thread."""

    def __init__(self, samplerate, channels, dtype, blocksize, callback, speech_frames=8):
        self.samplerate = samplerate
        self.blocksize = blocksize
        self.callback = callback
        self.speech_frames = speech_frames
        self._stop_flag = threading.Event()
        self._thread = None

    def start(self):
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        rng = np.random.default_rng(7)
        for _ in range(self.speech_frames):
            if self._stop_flag.is_set():
                return
            loud = rng.integers(-20000, 20000, size=self.blocksize).astype(np.int16)
            self.callback(loud.reshape(-1, 1), self.blocksize, None, None)
            time.sleep(0.01)
        silence = np.zeros(self.blocksize, dtype=np.int16)
        while not self._stop_flag.is_set():
            self.callback(silence.reshape(-1, 1), self.blocksize, None, None)
            time.sleep(0.01)

    def stop(self):
        self._stop_flag.set()
        if self._thread is not None:
            self._thread.join(timeout=2)

    def close(self):
        pass


def _make_fake_sd(speech_frames=8):
    class _FakeSD:
        @staticmethod
        def InputStream(samplerate, channels, dtype, blocksize, callback):
            return _FakeInputStream(samplerate, channels, dtype, blocksize, callback, speech_frames)

        @staticmethod
        def stop():
            pass

    return _FakeSD()


@pytest.fixture
def fast_config(tmp_path):
    return SpeechConfig(
        sample_rate=8000,
        frame_duration_ms=10,       # -> small blocksize, fast test
        silence_timeout=0.15,
        max_recording_seconds=2.0,
        min_recording_seconds=0.05,
        silence_rms_threshold=1000.0,
        use_webrtcvad=False,        # deterministic RMS-based VAD for the test
        output_directory=tmp_path,
    )


def test_start_recording_raises_when_no_backend_available(fast_config, monkeypatch):
    monkeypatch.setattr(audio_recorder_module, "_SOUNDDEVICE_AVAILABLE", False)
    recorder = AudioRecorder(fast_config)
    with pytest.raises(MicrophoneUnavailableError):
        recorder.start_recording()


def test_get_audio_bytes_before_recording_raises(fast_config):
    recorder = AudioRecorder(fast_config)
    with pytest.raises(EmptyRecordingError):
        recorder.get_audio_bytes()


def test_record_until_silence_happy_path(fast_config, monkeypatch):
    monkeypatch.setattr(audio_recorder_module, "_SOUNDDEVICE_AVAILABLE", True)
    monkeypatch.setattr(audio_recorder_module, "sd", _make_fake_sd(speech_frames=8))

    recorder = AudioRecorder(fast_config)
    wav_bytes = recorder.record_until_silence()

    assert isinstance(wav_bytes, bytes)
    assert len(wav_bytes) > 0
    # Must be a valid, parseable WAV stream at the configured sample rate.
    with wave.open(BytesIO(wav_bytes), "rb") as wf:
        assert wf.getframerate() == fast_config.sample_rate
        assert wf.getnchannels() == fast_config.channels
    assert recorder.duration_seconds() > 0


def test_record_until_silence_raises_timeout_when_no_speech(fast_config, monkeypatch):
    monkeypatch.setattr(audio_recorder_module, "_SOUNDDEVICE_AVAILABLE", True)
    monkeypatch.setattr(audio_recorder_module, "sd", _make_fake_sd(speech_frames=0))

    short_timeout_config = SpeechConfig(
        sample_rate=fast_config.sample_rate,
        frame_duration_ms=fast_config.frame_duration_ms,
        silence_timeout=fast_config.silence_timeout,
        max_recording_seconds=0.2,  # trigger timeout quickly
        min_recording_seconds=fast_config.min_recording_seconds,
        silence_rms_threshold=fast_config.silence_rms_threshold,
        use_webrtcvad=False,
        output_directory=fast_config.output_directory,
    )
    recorder = AudioRecorder(short_timeout_config)
    with pytest.raises(RecordingTimeoutError):
        recorder.record_until_silence()


def test_save_audio_writes_file(fast_config, monkeypatch, tmp_path):
    monkeypatch.setattr(audio_recorder_module, "_SOUNDDEVICE_AVAILABLE", True)
    monkeypatch.setattr(audio_recorder_module, "sd", _make_fake_sd(speech_frames=8))

    recorder = AudioRecorder(fast_config)
    recorder.record_until_silence()

    out_path = tmp_path / "nested" / "out.wav"
    saved_path = recorder.save_audio(out_path)
    assert saved_path.exists()
    assert saved_path.stat().st_size > 0


def test_is_speech_rms_fallback(fast_config):
    recorder = AudioRecorder(fast_config)
    loud = np.full(100, 20000, dtype=np.int16)
    quiet = np.zeros(100, dtype=np.int16)
    assert recorder._is_speech(loud) is True
    assert recorder._is_speech(quiet) is False
