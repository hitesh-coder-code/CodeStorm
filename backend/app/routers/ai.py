import httpx
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.ai import (
    ReflectionRequest,
    ReflectionResponse,
)
from app.services.gemma_service import (
    OLLAMA_MODEL,
    generate_reflection,
)


router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI Reflection"],
)


@router.post(
    "/reflection",
    response_model=ReflectionResponse,
)
async def create_reflection(
    reflection_data: ReflectionRequest,
    current_user: User = Depends(
        get_current_user
    ),
) -> ReflectionResponse:
    del current_user

    try:
        reflection, urgent_support = (
            await generate_reflection(
                journal_text=(
                    reflection_data.journal_text
                ),
                mood=reflection_data.mood,
            )
        )

        return ReflectionResponse(
            reflection=reflection,
            urgent_support=urgent_support,
            model=OLLAMA_MODEL,
        )

    except httpx.ConnectError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Ollama is not running. Open Ollama "
                "and confirm gemma3:4b is installed."
            ),
        ) from error

    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                "Gemma took too long to respond."
            ),
        ) from error

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Ollama returned an error."
            ),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to generate the reflection."
            ),
        ) from error