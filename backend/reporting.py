from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from database import get_db_connection


REPORT_COLUMNS = [
    {"key": "bill_month", "label": "帳單月份", "type": "text"},
    {"key": "bank_name", "label": "銀行", "type": "text"},
    {"key": "card_date", "label": "刷卡日期", "type": "date"},
    {"key": "post_date", "label": "入帳日期", "type": "date"},
    {"key": "detail", "label": "交易說明", "type": "text"},
    {"key": "location", "label": "地點", "type": "text"},
    {"key": "category", "label": "分類", "type": "text"},
    {"key": "amount", "label": "金額", "type": "currency"},
]


def _fetch_transactions(
    bill_month: Optional[str] = None,
    year: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = """
        SELECT id, bill_month, bank_name, card_date, post_date, detail, amount, location, category
        FROM transactions
        WHERE 1 = 1
    """
    params: List[Any] = []

    if bill_month:
        query += " AND bill_month = ?"
        params.append(bill_month)
    elif year:
        query += " AND bill_month LIKE ?"
        params.append(f"{year}-%")

    query += " ORDER BY bill_month DESC, card_date DESC, id DESC"

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def _fetch_effective_budgets(months: Iterable[str]) -> Dict[str, Dict[str, int]]:
    month_list = sorted(set(months))
    conn = get_db_connection()
    default_rows = conn.execute(
        "SELECT category, amount FROM budgets WHERE bill_month = 'DEFAULT'"
    ).fetchall()
    defaults = {row["category"]: int(row["amount"]) for row in default_rows}

    effective: Dict[str, Dict[str, int]] = {}
    for month in month_list:
        month_budget = dict(defaults)
        rows = conn.execute(
            "SELECT category, amount FROM budgets WHERE bill_month = ?",
            (month,),
        ).fetchall()
        for row in rows:
            month_budget[row["category"]] = int(row["amount"])
        effective[month] = month_budget

    conn.close()
    return effective


def _summary_rows(grouped: Dict[str, Dict[str, Any]], sort_key: str = "amount") -> List[Dict[str, Any]]:
    rows = list(grouped.values())
    rows.sort(key=lambda row: (row.get(sort_key, 0), row.get("name", "")), reverse=True)
    return rows


def build_statement_report(
    bill_month: Optional[str] = None,
    year: Optional[str] = None,
) -> Dict[str, Any]:
    transactions = _fetch_transactions(bill_month=bill_month, year=year)
    months = sorted({tx["bill_month"] for tx in transactions}, reverse=True)
    budgets_by_month = _fetch_effective_budgets(months)

    total_amount = sum(int(tx["amount"] or 0) for tx in transactions)
    total_count = len(transactions)
    avg_amount = round(total_amount / total_count, 2) if total_count else 0

    by_month: Dict[str, Dict[str, Any]] = {}
    by_category: Dict[str, Dict[str, Any]] = {}
    by_bank: Dict[str, Dict[str, Any]] = {}
    budget_usage: Dict[str, Dict[str, Any]] = {}

    for tx in transactions:
        amount = int(tx["amount"] or 0)
        month = tx["bill_month"]
        category = tx["category"] or "未分類"
        bank = tx["bank_name"] or "未指定"

        by_month.setdefault(month, {"name": month, "count": 0, "amount": 0, "banks": set()})
        by_month[month]["count"] += 1
        by_month[month]["amount"] += amount
        by_month[month]["banks"].add(bank)

        by_category.setdefault(category, {"name": category, "count": 0, "amount": 0, "share": 0})
        by_category[category]["count"] += 1
        by_category[category]["amount"] += amount

        by_bank.setdefault(bank, {"name": bank, "count": 0, "amount": 0, "share": 0})
        by_bank[bank]["count"] += 1
        by_bank[bank]["amount"] += amount

        budget_key = f"{month}:{category}"
        limit = budgets_by_month.get(month, {}).get(category, 0)
        budget_usage.setdefault(
            budget_key,
            {
                "month": month,
                "category": category,
                "budget": limit,
                "amount": 0,
                "variance": 0,
                "usage_rate": 0,
                "status": "no_budget",
            },
        )
        budget_usage[budget_key]["amount"] += amount
        budget_usage[budget_key]["budget"] = limit

    for group in (by_category, by_bank):
        for row in group.values():
            row["share"] = round((row["amount"] / total_amount) * 100, 2) if total_amount else 0

    for row in by_month.values():
        row["banks"] = sorted(row["banks"])
        row["bank_count"] = len(row["banks"])

    for row in budget_usage.values():
        budget = row["budget"]
        row["variance"] = budget - row["amount"]
        row["usage_rate"] = round((row["amount"] / budget) * 100, 2) if budget else 0
        if budget <= 0:
            row["status"] = "no_budget"
        elif row["amount"] > budget:
            row["status"] = "over_budget"
        elif row["amount"] >= budget * 0.8:
            row["status"] = "near_limit"
        else:
            row["status"] = "within_budget"

    report_title = "信用卡帳單彙整報表"
    period_label = bill_month or (f"{year} 年度" if year else "全部期間")

    return {
        "metadata": {
            "title": report_title,
            "period": period_label,
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "currency": "TWD",
            "export_ready": True,
        },
        "columns": REPORT_COLUMNS,
        "overview": {
            "total_amount": total_amount,
            "transaction_count": total_count,
            "average_amount": avg_amount,
            "month_count": len(months),
            "bank_count": len(by_bank),
            "category_count": len(by_category),
        },
        "sections": {
            "monthly_summary": _summary_rows(by_month, sort_key="name"),
            "category_summary": _summary_rows(by_category),
            "bank_summary": _summary_rows(by_bank),
            "budget_summary": _summary_rows(budget_usage),
            "transactions": transactions,
        },
    }


def list_report_periods() -> Dict[str, Any]:
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT bill_month, COUNT(*) AS transaction_count, SUM(amount) AS total_amount
        FROM transactions
        GROUP BY bill_month
        ORDER BY bill_month DESC
        """
    ).fetchall()
    conn.close()

    months = [dict(row) for row in rows]
    years = sorted({month["bill_month"][:4] for month in months if month["bill_month"]}, reverse=True)
    return {"months": months, "years": years}

