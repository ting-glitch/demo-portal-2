from typing import Optional

from fastapi import APIRouter, Query

from backend.reporting import build_statement_report, list_report_periods


router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/periods")
def get_report_periods():
    return list_report_periods()


@router.get("/statement")
def get_statement_report(
    bill_month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    year: Optional[str] = Query(None, pattern=r"^\d{4}$"),
):
    return build_statement_report(bill_month=bill_month, year=year)
