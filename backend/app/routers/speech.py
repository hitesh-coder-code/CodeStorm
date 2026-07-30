from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool

from app.dependencies.auth import get_current_user
from app.models.user import User


CODESTORM_ROOT = Path(__file__).resolve().parents[3]

if str(CODESTORM_ROOT) not in sys.path:
    sys.path.insert(0, str(CODESTORM_ROOT))


from speech import (  # noqa: E402
    SpeechConfig,
    SpeechModuleError,
    SpeechRecognizer,
)


router = APIRouter(
    prefix="/api/v1/speech",
    tags=["Speech"],
)


speech_config = SpeechConfig(
    model_size="tiny",
    device="cpu",
    compute_type="int8",
)

recognizer = SpeechRecognizer(
    config=speech_config,
)


CONTENT_TYPE_SUFFIXES = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
}


def determine_suffix(
    content_type: str | None,
    filename: str | None,
) -> str:
    normalized_type = (
        content_type or ""
    ).lower()

    for known_type, suffix in (
        CONTENT_TYPE_SUFFIXES.items()
    ):
        if normalized_type.startswith(
            known_type
        ):
            return suffix

    if filename:
        suffix = Path(filename).suffix.lower()

        if suffix in {
            ".wav",
            ".mp3",
            ".flac",
            ".m4a",
            ".ogg",
            ".webm",
        }:
            return suffix

    return ".webm"


def transcribe_from_closed_file(
    audio_bytes: bytes,
    suffix: str,
) -> dict[str, str | float]:
    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temporary_file:
            temporary_file.write(audio_bytes)
            temporary_file.flush()

            temporary_path = Path(
                temporary_file.name
            )

        # The temporary file is closed before Whisper opens it.
        result = recognizer.transcribe(
            temporary_path
        )

        return {
            "text": result["text"],
            "language": result["language"],
            "confidence": result[
                "confidence"
            ],
        }

    finally:
        if (
            temporary_path is not None
            and temporary_path.exists()
        ):
            try:
                temporary_path.unlink()
            except OSError:
                pass


@router.post(
    "/transcribe",
    summary="Transcribe browser-recorded audio",
)
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
) -> dict[str, str | float]:
    del current_user

    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded audio file is empty.",
        )

    maximum_size = 25 * 1024 * 1024

    if len(audio_bytes) > maximum_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio must be smaller than 25 MB.",
        )

    suffix = determine_suffix(
        content_type=audio.content_type,
        filename=audio.filename,
    )

    try:
        return await run_in_threadpool(
            transcribe_from_closed_file,
            audio_bytes,
            suffix,
        )

    except SpeechModuleError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to transcribe audio: "
                f"{error}"
            ),
        ) from error