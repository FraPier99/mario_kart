from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.services.tornei.results import create_result, get_result, get_results, update_result
from app.controllers.tornei.schemas.results import CreateResult, ResultResponse, UpdateResult


router = APIRouter(prefix="/results", tags=["Results"])


@router.get("", response_model=list[ResultResponse])
def all_results(db: Session = Depends(get_db)):
    return get_results(db)


@router.get("/{result_id}", response_model=ResultResponse)
def get_result_by_id(result_id: int, db: Session = Depends(get_db)):
    result = get_result(db, result_id)

    if not result:
        raise HTTPException(
            status_code=404, detail=f"Result with id {result_id} not found"
        )

    return result


@router.post("", response_model=ResultResponse, status_code=201)
def insert_result(resultData: CreateResult, db: Session = Depends(get_db), current_user=Depends(require_roles("superadmin", "admin"))):
    try:
        result = create_result(db, resultData)

        if not result:
            raise HTTPException(status_code=404, detail="Race not found")

        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Position")
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid data")


@router.delete("/{result_id}")
def delete_result_by_id(result_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles("superadmin", "admin"))):
    from app.services.tornei.results import delete_result as crud_delete_result

    deleted = crud_delete_result(db, result_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Result not found")
    return {"message": "Result deleted successfully"}


@router.put("/{result_id}", response_model=ResultResponse)
def update_result_by_id(
    result_id: int, resultData: UpdateResult, db: Session = Depends(get_db), current_user=Depends(require_roles("superadmin", "admin"))
):
    try:
        result = update_result(db, resultData, result_id)

        if not result:
            raise HTTPException(status_code=404, detail="Result not found")

        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Position")
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid data")
