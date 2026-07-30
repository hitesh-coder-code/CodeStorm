"""
SpeechSynthesizer: offline-first text-to-speech using Coqui TTS, with
automatic fallback to gTTS (requires internet access) when Coqui TTS
is not installed or fails to load.
"""

from __future__ import annotations

import tempfile
import threading
from pathlib import Path
from typing import Optional, Union

from .config import DEFAULT_CONFIG, SpeechConfig
from .utils import SynthesisError, ensure_parent_dir, get_logger

logger = get_logger(__name__)

# --- Optional dependency: Coqui TTS (preferred, fully offline) -------------
try:
    from TTS.api import TTS as CoquiTTS

    _COQUI_AVAILABLE = True
except ImportError:
    CoquiTTS = None  # type: ignore[assignment]
    _COQUI_AVAILABLE = False

# --- Optional dependency: gTTS (fallback, requires internet) ---------------
try:
    from gtts import gTTS

    _GTTS_AVAILABLE = True
except ImportError:
    gTTS = None  # type: ignore[assignment]
    _GTTS_AVAILABLE = False

# --- Optional dependency: WAV playback (sounddevice + soundfile) ----------
try:
    import sounddevice as sd
    import soundfile as sf

    _PLAYBACK_WAV_AVAILABLE = True
except (ImportError, OSError):
    sd = None  # type: ignore[assignment]
    sf = None  # type: ignore[assignment]
    _PLAYBACK_WAV_AVAILABLE = False

# --- Optional dependency: generic playback (used for gTTS's mp3 output) ---
try:
    from playsound import playsound

    _PLAYSOUND_AVAILABLE = True
except ImportError:
    playsound = None  # type: ignore[assignment]
    _PLAYSOUND_AVAILABLE = False


class SpeechSynthesizer:
    """Converts text to speech, preferring fully-offline Coqui TTS.

    Engine selection happens once, at construction time:
      1. If `config.tts_engine == "coqui"` and the `TTS` package is
         installed -> use Coqui TTS (offline).
      2. Otherwise, if `gTTS` is installed -> use it (requires internet).
      3. Otherwise -> raise `SynthesisError` immediately, so the failure
         is surfaced at start-up rather than on the first `speak()` call.
    """

    def __init__(self, config: Optional[SpeechConfig] = None) -> None:
        self.config = config or DEFAULT_CONFIG
        self._coqui_model: Optional["CoquiTTS"] = None
        self._stop_event = threading.Event()
        self._playback_thread: Optional[threading.Thread] = None
        self._engine = self._select_engine()
        logger.info("SpeechSynthesizer initialized with engine: %s", self._engine)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def speak(self, text: str, blocking: bool = True) -> None:
        """Synthesize `text` and play it through the default output device.

        Args:
            text: The text to speak. No-op (with a warning) if blank.
            blocking: If True (default), blocks until playback finishes.
                If False, playback runs on a background thread.
        """
        if not text or not text.strip():
            logger.warning("speak() called with empty text; ignoring.")
            return

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir) / "tts_output.wav"
            out_path = self.save_to_file(text, tmp_path)
            self._play_file(out_path, blocking=blocking)

    def save_to_file(self, text: str, path: Union[str, Path]) -> Path:
        """Synthesize `text` and write the resulting audio to `path`.

        Note: when the gTTS fallback engine is used, the actual file
        written will have an `.mp3` extension regardless of the
        extension passed in `path` (the returned Path reflects this).

        Returns:
            The resolved output Path that was actually written.

        Raises:
            SynthesisError: if synthesis fails for any reason (missing
                engine, model load failure, network error for gTTS, etc).
        """
        if not text or not text.strip():
            raise SynthesisError("Cannot synthesize empty text.")

        out_path = ensure_parent_dir(path)

        try:
            if self._engine == "coqui":
                self._synthesize_coqui(text, out_path)
                written_path = out_path
            else:
                written_path = self._synthesize_gtts(text, out_path)
        except SynthesisError:
            raise
        except Exception as exc:
            raise SynthesisError(f"Text-to-speech synthesis failed: {exc}") from exc

        logger.info("TTS completed: '%s' -> %s (engine=%s)", _truncate(text), written_path, self._engine)
        return written_path

    def stop(self) -> None:
        """Stop any in-progress playback started by this instance."""
        self._stop_event.set()
        if _PLAYBACK_WAV_AVAILABLE:
            try:
                sd.stop()
            except Exception as exc:  # pragma: no cover - defensive
                logger.debug("Error while stopping playback: %s", exc)
        logger.info("TTS playback stop requested.")

    # ------------------------------------------------------------------
    # Internal: engine selection & synthesis
    # ------------------------------------------------------------------

    def _select_engine(self) -> str:
        """Pick the best available engine, preferring Coqui TTS (offline)."""
        if self.config.tts_engine == "coqui":
            if _COQUI_AVAILABLE:
                return "coqui"
            logger.warning("Coqui TTS not installed; falling back to gTTS.")
        if _GTTS_AVAILABLE:
            return "gtts"
        raise SynthesisError(
            "No TTS engine available. Install either 'TTS' (Coqui, fully "
            "offline, recommended) or 'gTTS' (online fallback)."
        )

    def _get_coqui_model(self) -> "CoquiTTS":
        if self._coqui_model is None:
            try:
                logger.info("Loading Coqui TTS model '%s'...", self.config.tts_voice)
                self._coqui_model = CoquiTTS(model_name=self.config.tts_voice, progress_bar=False)
            except Exception as exc:
                raise SynthesisError(f"Failed to load Coqui TTS model '{self.config.tts_voice}': {exc}") from exc
        return self._coqui_model

    def _synthesize_coqui(self, text: str, out_path: Path) -> None:
        model = self._get_coqui_model()
        try:
            model.tts_to_file(text=text, file_path=str(out_path), speed=self.config.tts_speed)
        except TypeError:
            # Some Coqui voices/models don't accept a `speed` kwarg.
            model.tts_to_file(text=text, file_path=str(out_path))

    def _synthesize_gtts(self, text: str, out_path: Path) -> Path:
        if not _GTTS_AVAILABLE:
            raise SynthesisError("gTTS is not installed and no other TTS engine is available.")
        try:
            tts = gTTS(text=text, lang=self.config.tts_language)
            mp3_path = out_path.with_suffix(".mp3")
            tts.save(str(mp3_path))
            return mp3_path
        except Exception as exc:
            raise SynthesisError(f"gTTS synthesis failed (requires internet access): {exc}") from exc

    # ------------------------------------------------------------------
    # Internal: playback
    # ------------------------------------------------------------------

    def _play_file(self, path: Path, blocking: bool) -> None:
        self._stop_event.clear()
        suffix = path.suffix.lower()

        def _play() -> None:
            try:
                if suffix == ".wav" and _PLAYBACK_WAV_AVAILABLE:
                    data, samplerate = sf.read(str(path), dtype="float32")
                    sd.play(data, samplerate)
                    sd.wait()
                elif _PLAYSOUND_AVAILABLE:
                    playsound(str(path))
                else:
                    raise SynthesisError(
                        "No audio playback backend available. Install "
                        "'sounddevice' + 'soundfile' (for WAV) or "
                        "'playsound' (for MP3, e.g. gTTS output)."
                    )
            except Exception as exc:
                logger.error("Audio playback failed: %s", exc)

        if blocking:
            _play()
        else:
            self._playback_thread = threading.Thread(target=_play, daemon=True)
            self._playback_thread.start()


def _truncate(text: str, limit: int = 60) -> str:
    """Shorten `text` for compact, readable log lines."""
    return text if len(text) <= limit else text[: limit - 3] + "..."
