"""
AudioRecorder: microphone capture with automatic silence-based stop
(voice activity detection), for the CodeStorm speech module.

Primary backend: `sounddevice` (PortAudio bindings). If PortAudio or the
`sounddevice` package is unavailable, every recording method raises a
clear `MicrophoneUnavailableError` instead of crashing the host
application.
"""

from __future__ import annotations

import queue
import threading
import time
from pathlib import Path
from typing import List, Optional, Union

import numpy as np

from .config import DEFAULT_CONFIG, SpeechConfig
from .utils import (
    EmptyRecordingError,
    MicrophoneUnavailableError,
    RecordingTimeoutError,
    ensure_parent_dir,
    get_logger,
    pcm16_to_wav_bytes,
    rms,
)

logger = get_logger(__name__)

# --- Optional dependency: sounddevice / PortAudio ---------------------------
try:
    import sounddevice as sd

    _SOUNDDEVICE_AVAILABLE = True
except OSError as exc:  # PortAudio native library missing
    sd = None  # type: ignore[assignment]
    _SOUNDDEVICE_AVAILABLE = False
    logger.warning("sounddevice failed to load the PortAudio backend: %s", exc)
except ImportError:
    sd = None  # type: ignore[assignment]
    _SOUNDDEVICE_AVAILABLE = False
    logger.warning("sounddevice is not installed; live recording will be unavailable.")

# --- Optional dependency: webrtcvad -----------------------------------------
try:
    import webrtcvad

    _WEBRTCVAD_AVAILABLE = True
except ImportError:
    webrtcvad = None  # type: ignore[assignment]
    _WEBRTCVAD_AVAILABLE = False


class AudioRecorder:
    """Records microphone audio with automatic silence detection.

    Two usage styles are supported:

    Manual control::

        recorder = AudioRecorder()
        recorder.start_recording()
        time.sleep(3)
        recorder.stop_recording()
        wav_bytes = recorder.get_audio_bytes()

    Automatic (recommended for voice assistants)::

        wav_bytes = recorder.record_until_silence()
    """

    def __init__(self, config: Optional[SpeechConfig] = None) -> None:
        self.config = config or DEFAULT_CONFIG
        self._frames: List[np.ndarray] = []
        self._frame_queue: "queue.Queue[np.ndarray]" = queue.Queue()
        self._stream: Optional["sd.InputStream"] = None
        self._recording = False

        self._vad = None
        if self.config.use_webrtcvad and _WEBRTCVAD_AVAILABLE:
            try:
                self._vad = webrtcvad.Vad(self.config.vad_aggressiveness)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Failed to initialize webrtcvad, using RMS-based VAD instead: %s", exc)
                self._vad = None
        elif self.config.use_webrtcvad and not _WEBRTCVAD_AVAILABLE:
            logger.info("webrtcvad not installed; using RMS-based silence detection instead.")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start_recording(self) -> None:
        """Open the input stream and begin capturing audio frames.

        Raises:
            MicrophoneUnavailableError: if no input device can be opened.
        """
        if not _SOUNDDEVICE_AVAILABLE:
            raise MicrophoneUnavailableError(
                "sounddevice/PortAudio is not available on this system. "
                "Install it (`pip install sounddevice`) and ensure a "
                "microphone is connected and accessible."
            )
        if self._recording:
            logger.warning("start_recording() called while already recording; ignoring.")
            return

        self._frames = []
        self._frame_queue = queue.Queue()

        try:
            self._stream = sd.InputStream(
                samplerate=self.config.sample_rate,
                channels=self.config.channels,
                dtype=self.config.dtype,
                blocksize=self._frame_size(),
                callback=self._audio_callback,
            )
            self._stream.start()
        except Exception as exc:
            raise MicrophoneUnavailableError(f"Could not open microphone stream: {exc}") from exc

        self._recording = True
        logger.info(
            "Recording started (sample_rate=%d Hz, channels=%d).",
            self.config.sample_rate, self.config.channels,
        )

    def stop_recording(self) -> None:
        """Stop capturing and close the input stream, if open."""
        if not self._recording:
            return
        self._recording = False
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception as exc:  # pragma: no cover - defensive
                logger.error("Error while closing audio stream: %s", exc)
            finally:
                self._stream = None
        self._drain_queue()
        logger.info("Recording stopped. Captured %.2fs of audio.", self.duration_seconds())

    def record_until_silence(self) -> bytes:
        """Record from the microphone until silence is detected, or timeout.

        This is the primary convenience method for voice-assistant style
        interaction: it combines start/stop with voice-activity detection
        so the caller does not need to manage timing manually.

        Returns:
            WAV-encoded audio bytes.

        Raises:
            MicrophoneUnavailableError: if no input device is usable.
            RecordingTimeoutError: if `max_recording_seconds` is reached
                before any speech is detected at all.
            EmptyRecordingError: if the recording is too short or contains
                only silence.
        """
        self.start_recording()
        start_time = time.monotonic()
        last_voice_time = start_time
        voice_detected = False

        try:
            while True:
                new_chunks = self._drain_queue()
                elapsed = time.monotonic() - start_time

                if new_chunks and any(self._is_speech(chunk) for chunk in new_chunks):
                    last_voice_time = time.monotonic()
                    voice_detected = True

                silence_elapsed = time.monotonic() - last_voice_time

                if voice_detected and silence_elapsed >= self.config.silence_timeout:
                    logger.info("Silence detected for %.2fs; stopping recording.", silence_elapsed)
                    break

                if elapsed >= self.config.max_recording_seconds:
                    if not voice_detected:
                        raise RecordingTimeoutError(
                            f"No speech detected within {self.config.max_recording_seconds}s."
                        )
                    logger.warning("Maximum recording duration reached; stopping.")
                    break

                time.sleep(0.02)
        finally:
            self.stop_recording()

        if self.duration_seconds() < self.config.min_recording_seconds:
            raise EmptyRecordingError("Recording too short to contain meaningful speech.")
        if not voice_detected:
            raise EmptyRecordingError("No speech detected; recording contained only silence.")

        return self.get_audio_bytes()

    def save_audio(self, path: Union[str, Path]) -> Path:
        """Persist the currently captured audio to a WAV file on disk.

        Returns:
            The resolved output Path.
        """
        out_path = ensure_parent_dir(path)
        out_path.write_bytes(self.get_audio_bytes())
        logger.info("Audio saved to %s", out_path)
        return out_path

    def get_audio_bytes(self) -> bytes:
        """Return all audio captured so far, encoded as WAV bytes.

        Raises:
            EmptyRecordingError: if nothing has been recorded yet.
        """
        if not self._frames:
            raise EmptyRecordingError("No audio has been recorded yet.")
        pcm = np.concatenate(self._frames, axis=0)
        return pcm16_to_wav_bytes(pcm.astype(np.int16).tobytes(), self.config.sample_rate, self.config.channels)

    def duration_seconds(self) -> float:
        """Return the total duration, in seconds, of the audio captured so far."""
        if not self._frames:
            return 0.0
        total_samples = sum(chunk.shape[0] for chunk in self._frames)
        return total_samples / float(self.config.sample_rate)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _frame_size(self) -> int:
        """Samples per callback block, sized to match the VAD frame duration."""
        return int(self.config.sample_rate * self.config.frame_duration_ms / 1000)

    def _audio_callback(self, indata: np.ndarray, frames: int, time_info, status) -> None:
        """sounddevice callback: runs on a separate audio thread."""
        if status:
            logger.debug("Audio callback status flags: %s", status)
        self._frame_queue.put(indata.copy().reshape(-1))

    def _drain_queue(self) -> List[np.ndarray]:
        """Move any pending frames from the callback queue into `_frames`.

        Returns:
            The list of newly drained chunks (empty if none were pending).
        """
        new_chunks: List[np.ndarray] = []
        while True:
            try:
                chunk = self._frame_queue.get_nowait()
            except queue.Empty:
                break
            self._frames.append(chunk)
            new_chunks.append(chunk)
        return new_chunks

    def _is_speech(self, frame: np.ndarray) -> bool:
        """Determine whether a frame contains speech (webrtcvad, else RMS)."""
        if self._vad is not None:
            try:
                frame_bytes = frame.astype(np.int16).tobytes()
                expected_len = self._frame_size() * 2  # int16 -> 2 bytes/sample
                if len(frame_bytes) == expected_len:
                    return bool(self._vad.is_speech(frame_bytes, self.config.sample_rate))
            except Exception as exc:  # pragma: no cover - defensive
                logger.debug("webrtcvad failed on a frame, falling back to RMS: %s", exc)
        return rms(frame) >= self.config.silence_rms_threshold
