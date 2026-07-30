"""
Tests for speech.voice_pipeline.VoicePipeline.

VoicePipeline accepts injected recorder/recognizer/synthesizer
instances, so these tests use lightweight fakes rather than touching
real hardware or ML models.
"""

import pytest

from speech.utils import EmptyRecordingError, SynthesisError
from speech.voice_pipeline import VoicePipeline


class _FakeRecorder:
    def __init__(self, audio_bytes=b"FAKE_AUDIO", error=None):
        self._audio_bytes = audio_bytes
        self._error = error

    def record_until_silence(self):
        if self._error:
            raise self._error
        return self._audio_bytes


class _FakeRecognizer:
    def __init__(self, text="hello assistant", error=None):
        self._text = text
        self._error = error

    def transcribe_bytes(self, audio_bytes):
        if self._error:
            raise self._error
        return {"text": self._text, "language": "en", "confidence": 0.9}


class _FakeSynthesizer:
    def __init__(self, error=None):
        self.spoken = []
        self._error = error

    def speak(self, text, blocking=True):
        if self._error:
            raise self._error
        self.spoken.append(text)


def _make_pipeline(recorder=None, recognizer=None, synthesizer=None, response_handler=None):
    return VoicePipeline(
        recorder=recorder or _FakeRecorder(),
        recognizer=recognizer or _FakeRecognizer(),
        synthesizer=synthesizer or _FakeSynthesizer(),
        response_handler=response_handler,
    )


def test_listen_happy_path():
    pipeline = _make_pipeline(recognizer=_FakeRecognizer(text="turn on the lights"))
    assert pipeline.listen() == "turn on the lights"


def test_listen_returns_empty_string_on_recording_failure():
    pipeline = _make_pipeline(recorder=_FakeRecorder(error=EmptyRecordingError("silence only")))
    assert pipeline.listen() == ""


def test_listen_returns_empty_string_on_transcription_failure():
    from speech.utils import TranscriptionError

    pipeline = _make_pipeline(recognizer=_FakeRecognizer(error=TranscriptionError("bad audio")))
    assert pipeline.listen() == ""


def test_listen_full_returns_full_result():
    pipeline = _make_pipeline(recognizer=_FakeRecognizer(text="hi"))
    result = pipeline.listen_full()
    assert result is not None
    assert result["text"] == "hi"
    assert result["language"] == "en"


def test_listen_full_returns_none_on_failure():
    pipeline = _make_pipeline(recorder=_FakeRecorder(error=EmptyRecordingError("nope")))
    assert pipeline.listen_full() is None


def test_speak_delegates_to_synthesizer():
    fake_synth = _FakeSynthesizer()
    pipeline = _make_pipeline(synthesizer=fake_synth)
    pipeline.speak("hello there")
    assert fake_synth.spoken == ["hello there"]


def test_speak_never_raises_on_synthesis_failure():
    fake_synth = _FakeSynthesizer(error=SynthesisError("tts down"))
    pipeline = _make_pipeline(synthesizer=fake_synth)
    pipeline.speak("hello there")  # must not raise


def test_converse_once_uses_default_placeholder_response():
    fake_synth = _FakeSynthesizer()
    pipeline = _make_pipeline(recognizer=_FakeRecognizer(text="what time is it"), synthesizer=fake_synth)
    response = pipeline.converse_once()
    assert response == "This is a placeholder response."
    assert fake_synth.spoken == ["This is a placeholder response."]


def test_converse_once_uses_custom_response_handler():
    def handler(text: str) -> str:
        return f"You said: {text}"

    fake_synth = _FakeSynthesizer()
    pipeline = _make_pipeline(
        recognizer=_FakeRecognizer(text="hello"),
        synthesizer=fake_synth,
        response_handler=handler,
    )
    response = pipeline.converse_once()
    assert response == "You said: hello"
    assert fake_synth.spoken == ["You said: hello"]


def test_converse_once_skips_response_when_nothing_heard():
    fake_synth = _FakeSynthesizer()
    pipeline = _make_pipeline(
        recorder=_FakeRecorder(error=EmptyRecordingError("silence")),
        synthesizer=fake_synth,
    )
    response = pipeline.converse_once()
    assert response == ""
    assert fake_synth.spoken == []


def test_set_response_handler_overrides_default():
    pipeline = _make_pipeline(recognizer=_FakeRecognizer(text="hi"))
    pipeline.set_response_handler(lambda text: "custom reply")
    assert pipeline.converse_once() == "custom reply"
