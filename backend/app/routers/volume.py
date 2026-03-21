"""Volume optimization endpoint."""

from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.volume import OptimizeRequest, OptimizeResponse
from app.services.volume_optimizer import create_mesocycle_volume
from app.utils.auth import get_current_user

router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_volume(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
):
    """Compute optimal weekly volume profile for a mesocycle."""
    result = create_mesocycle_volume(
        experience_level=request.experience_level,
        total_weeks=request.total_weeks,
        w_max=request.w_max,
    )
    return result
