from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.report import Report, ReportType, ReportStatus
from app.models.user import User

router = APIRouter(tags=["reports"])


class ReportIn(BaseModel):
    type: ReportType
    target_id: int
    reason: str


class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    admin_note: Optional[str] = None


def _to_out(r: Report):
    return {
        "id": r.id,
        "type": r.type,
        "target_id": r.target_id,
        "reason": r.reason,
        "status": r.status,
        "admin_note": r.admin_note,
        "reporter_id": r.reporter_id,
        "reporter_name": r.reporter.full_name or r.reporter.username if r.reporter else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("/admin/reports")
def submit_report(
    body: ReportIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if len(body.reason.strip()) < 3:
        raise HTTPException(400, "Укажите причину")
    report = Report(
        reporter_id=user.id,
        type=body.type,
        target_id=body.target_id,
        reason=body.reason.strip(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "status": "ok"}


@router.get("/admin/reports/all")
def get_all_reports(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    q = db.query(Report)
    if status:
        q = q.filter(Report.status == status)
    reports = q.order_by(Report.created_at.desc()).all()
    return [_to_out(r) for r in reports]


@router.patch("/admin/reports/admin/{report_id}")
def update_report(
    report_id: int,
    body: ReportUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Not found")
    if body.status is not None:
        report.status = body.status
    if body.admin_note is not None:
        report.admin_note = body.admin_note
    db.commit()
    db.refresh(report)
    return _to_out(report)
