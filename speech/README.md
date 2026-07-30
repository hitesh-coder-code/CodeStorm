# CodeStorm Speech Module

An offline-first speech pipeline for the CodeStorm AI assistant: audio
recording with automatic voice-activity detection, offline speech-to-text
(Faster-Whisper), and text-to-speech (Coqui TTS, with a gTTS fallback).

The module is **UI-agnostic** — it exposes plain Python classes with no
dependency on any web framework, desktop toolkit, or CLI library, so the
exact same code can be called from a Flask/FastAPI backend, a desktop
app, a CLI tool, or a future mobile bridge.

```
speech/
├── __init__.py              # public API surface
├── config.py                 # SpeechConfig — every tunable constant lives here
├── utils.py                  # exceptions, logging, small audio helpers
├── audio_recorder.py          # AudioRecorder — mic capture + VAD-based auto-stop
├── speech_recognizer.py       # SpeechRecognizer — Faster-Whisper STT
├── speech_synthesizer.py      # SpeechSynthesizer — Coqui TTS / gTTS
├── voice_pipeline.py          # VoicePipeline — orchestrates the above
├── example_usage.py           # runnable examples / integration patterns
├── requirements.txt
├── README.md
└── tests/                     # pytest unit tests (44 tests, all mocked — no mic/models needed)
```

## 1. Installation

### System prerequisites (install via your OS package manager)

| Dependency | Why | Debian/Ubuntu | macOS |
|---|---|---|---|
| PortAudio | required by `sounddevice` for mic access | `sudo apt-get install portaudio19-dev` | `brew install portaudio` |
| ffmpeg | broader audio format support | `sudo apt-get install ffmpeg` | `brew install ffmpeg` |

### Python dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r speech/requirements.txt
```

Everything in `requirements.txt` beyond `numpy` is treated as **optional
at import time**. If, say, `TTS` (Coqui) isn't installed, the module
automatically falls back to `gTTS`; if neither is installed, you get a
clear `SynthesisError` at construction time instead of an import crash.
This lets you install a minimal subset for CI/tests and the full stack
only where audio actually needs to run.

## 2. Quick start

```python
from speech import VoicePipeline

pipeline = VoicePipeline()

text = pipeline.listen()        # records mic until silence, returns transcript
print("Heard:", text)

pipeline.speak("Hello! I'm CodeStorm.")   # synthesizes + plays audio
```

That's the entire integration surface most callers need.

## 3. Public API

Everything below is importable directly from the `speech` package:

```python
from speech import (
    VoicePipeline,
    AudioRecorder, SpeechRecognizer, SpeechSynthesizer,
    SpeechConfig, DEFAULT_CONFIG,
    SpeechModuleError, MicrophoneUnavailableError, EmptyRecordingError,
    RecordingTimeoutError, CorruptedAudioError, UnsupportedFormatError,
    ModelLoadError, TranscriptionError, SynthesisError,
)
```

### `VoicePipeline` — the recommended entry point

```python
pipeline = VoicePipeline()

text = pipeline.listen()                 # -> str, "" if nothing understood
result = pipeline.listen_full()          # -> {"text","language","confidence"} or None

pipeline.speak("Hi there!")              # blocking playback
pipeline.speak("Hi there!", blocking=False)

response = pipeline.converse_once()      # listen -> respond -> speak, one full turn
```

By default, `converse_once()` uses a **placeholder** response:
`"This is a placeholder response."` — this module intentionally has zero
knowledge of the LLM module. Wire in the real one later:

```python
from llm.engine import generate_reply   # future CodeStorm LLM module

pipeline.set_response_handler(generate_reply)
# or: VoicePipeline(response_handler=generate_reply)
```

### `AudioRecorder` — microphone capture + VAD

```python
from speech import AudioRecorder

recorder = AudioRecorder()

# Automatic: records until silence_timeout seconds of quiet, or timeout
wav_bytes = recorder.record_until_silence()

# Manual control
recorder.start_recording()
...
recorder.stop_recording()
recorder.save_audio("clip.wav")
audio_bytes = recorder.get_audio_bytes()
```

Silence detection uses `webrtcvad` when installed (more robust to
background noise), and transparently falls back to an RMS-amplitude
threshold otherwise — no code changes required either way.

### `SpeechRecognizer` — offline STT (Faster-Whisper)

```python
from speech import SpeechRecognizer

recognizer = SpeechRecognizer()

result = recognizer.transcribe("clip.wav")
# {"text": "...", "language": "en", "confidence": 0.97}

result = recognizer.transcribe_bytes(wav_bytes)
```

Language is auto-detected by default (`config.language = None`); pin a
language by setting `SpeechConfig(language="en")` for lower latency.

### `SpeechSynthesizer` — TTS (Coqui, fallback gTTS)

```python
from speech import SpeechSynthesizer

synth = SpeechSynthesizer()
synth.speak("Hello!")                 # synthesizes + plays
synth.save_to_file("Hello!", "out.wav")
synth.stop()                          # stop in-progress playback
```

## 4. Configuration

All tunables live in `SpeechConfig` (`speech/config.py`) — **no magic
numbers appear anywhere else in the codebase**. Override per-instance:

```python
from speech import SpeechConfig, VoicePipeline

config = SpeechConfig(
    sample_rate=16000,
    model_size="base",          # tiny | base | small | medium | large-v3
    device="cuda",               # "cpu" | "cuda" | "auto"
    compute_type="float16",
    silence_timeout=2.0,
    tts_voice="tts_models/en/ljspeech/tacotron2-DDC",
    tts_speed=1.1,
)

pipeline = VoicePipeline(config=config)
```

Or override via environment variables (handy for Docker/CI), e.g.:

```bash
export CODESTORM_MODEL_SIZE=base
export CODESTORM_DEVICE=cuda
export CODESTORM_SILENCE_TIMEOUT=2.0
export CODESTORM_TTS_ENGINE=gtts
```

See `config.py` for the full list of supported variables.

## 5. Error handling

Every failure mode raises a specific, catchable exception rather than
crashing the process:

| Exception | Raised when |
|---|---|
| `MicrophoneUnavailableError` | no input device / PortAudio missing |
| `EmptyRecordingError` | recording was silence-only or too short |
| `RecordingTimeoutError` | max duration hit with no speech detected |
| `CorruptedAudioError` | audio file/bytes can't be decoded |
| `UnsupportedFormatError` | unsupported file extension |
| `ModelLoadError` | STT/TTS model failed to load (missing package, bad weights, etc.) |
| `TranscriptionError` | STT inference itself failed |
| `SynthesisError` | TTS synthesis or playback failed |

All of the above inherit from `SpeechModuleError`, so you can catch
broadly or narrowly:

```python
from speech import SpeechModuleError

try:
    text = recognizer.transcribe("clip.wav")
except SpeechModuleError as exc:
    log.warning("Speech pipeline issue: %s", exc)
```

`VoicePipeline.listen()` and `.speak()` already catch `SpeechModuleError`
internally and degrade gracefully (returning `""` / logging), so
higher-level integration code usually doesn't need its own try/except at
all.

## 6. Logging

The module uses the standard `logging` module (`speech.utils.get_logger`)
and logs: recording start/stop (with duration), transcription completion
(with language/confidence), TTS completion, and all exceptions. Configure
verbosity from your application's entry point as usual:

```python
import logging
logging.getLogger("speech").setLevel(logging.DEBUG)
```

## 7. Running the tests

```bash
cd backend
pip install pytest
pytest speech/tests/ -v
```

All 44 tests run **without a microphone, GPU, or downloaded models** —
heavy dependencies (Faster-Whisper, Coqui TTS, gTTS, webrtcvad,
sounddevice's PortAudio backend) are swapped for lightweight fakes via
`monkeypatch`, so the suite is fast and CI-friendly while still
exercising the real control flow (VAD timing, error paths, engine
fallback logic, etc.).

## 8. Example usage

See `example_usage.py` for runnable demos:

```bash
python -m speech.example_usage --mode file      # no mic needed: TTS -> STT round trip
python -m speech.example_usage --mode pipeline   # one full mic -> STT -> TTS turn
python -m speech.example_usage --mode loop        # continuous voice-assistant loop
python -m speech.example_usage --mode llm-pattern # shows the future LLM hookup point
python -m speech.example_usage --mode manual      # low-level AudioRecorder control
```

## 9. Integration notes for other CodeStorm modules

- **`api/`** (HTTP layer): call `VoicePipeline.listen()` / `.speak()`
  from your request handlers; wrap in a thread/async executor if your
  framework is async, since these calls block on I/O and inference.
- **`llm/`**: call `pipeline.set_response_handler(your_generate_fn)`
  once the LLM module exposes a `str -> str` (or async-wrapped) entry
  point. No changes to this module are required.
- **`memory/`**: this module is stateless between calls by design —
  persist transcripts/responses in the memory module if needed, using
  `pipeline.listen_full()` to also capture language/confidence.
- **`frontend/`**: never imported here and never should be — all
  audio I/O happens through the OS audio stack (mic + speakers), which
  works identically whether triggered from web, desktop, or CLI.

## 10. Performance notes

- **CPU-first**: default `compute_type="int8"` and `model_size="small"`
  are chosen for good CPU latency/accuracy balance out of the box.
- **GPU when available**: set `device="cuda"` and
  `compute_type="float16"` to use a GPU automatically — no other code
  changes needed.
- **Low latency**: Faster-Whisper's own `vad_filter=True` trims
  silence before decoding; `AudioRecorder`'s VAD avoids sending dead
  air to the model in the first place.
- **Memory**: the Whisper model and Coqui TTS model are each loaded
  lazily and cached once per `SpeechRecognizer`/`SpeechSynthesizer`
  instance — construct these once (e.g. at app start-up) and reuse
  them rather than creating new instances per request.
