from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import service_account


SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
API_ROOT = "https://www.googleapis.com/webmasters/v3/sites"
REPORT_FILE = Path("search-console-report.md")


def env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_access_token(credentials_file: str) -> str:
    creds = service_account.Credentials.from_service_account_file(
        credentials_file,
        scopes=SCOPES,
    )
    creds.refresh(GoogleRequest())
    if not creds.token:
        raise RuntimeError("Could not obtain a Search Console access token.")
    return creds.token


def query_search_console(
    token: str,
    site_url: str,
    body: dict[str, Any],
) -> dict[str, Any]:
    encoded_site = quote(site_url, safe="")
    url = f"{API_ROOT}/{encoded_site}/searchAnalytics/query"
    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def row_keys(row: dict[str, Any]) -> list[str]:
    return row.get("keys", [])


def format_number(value: float) -> str:
    if isinstance(value, int) or float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}"


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    if not rows:
        return "_No data returned._"
    header_line = "| " + " | ".join(headers) + " |"
    separator = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = "\n".join("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join([header_line, separator, body])


def summarize_queries(rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["No query data returned for this period."]

    low_ctr_high_impressions = []
    for row in rows:
        query = row_keys(row)[0] if row_keys(row) else "(unknown)"
        impressions = row.get("impressions", 0.0)
        ctr = row.get("ctr", 0.0)
        clicks = row.get("clicks", 0.0)
        if impressions >= 20 and ctr < 0.03:
            low_ctr_high_impressions.append((impressions, query, ctr, clicks))

    low_ctr_high_impressions.sort(reverse=True)
    suggestions = []
    if low_ctr_high_impressions:
        top = low_ctr_high_impressions[:3]
        suggestions.append(
            "Improve title/description alignment for these low-CTR queries: "
            + ", ".join(
                f"`{query}` ({int(impressions)} impressions, {ctr * 100:.1f}% CTR)"
                for impressions, query, ctr, _clicks in top
            )
        )

    branded = [row for row in rows if "blastiic" in (row_keys(row)[0] if row_keys(row) else "").lower()]
    if branded:
        branded_clicks = sum(row.get("clicks", 0.0) for row in branded)
        suggestions.append(
            f"Branded discovery is active: `BLASTIIC`-related queries generated {format_number(branded_clicks)} clicks in this window."
        )

    if not suggestions:
        suggestions.append("Query mix looks healthy. Keep publishing fresh release and artist updates to widen non-branded discovery.")

    return suggestions


def summarize_pages(rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["No page data returned for this period."]

    by_impressions = sorted(rows, key=lambda row: row.get("impressions", 0.0), reverse=True)
    suggestions = []
    top_page = by_impressions[0]
    top_page_url = row_keys(top_page)[0] if row_keys(top_page) else "(unknown)"
    suggestions.append(
        f"Top visible page this week: `{top_page_url}` with {format_number(top_page.get('impressions', 0.0))} impressions."
    )

    underperforming = [
        row for row in rows
        if row.get("impressions", 0.0) >= 15 and row.get("ctr", 0.0) < 0.03
    ]
    if underperforming:
        sample = underperforming[:2]
        suggestions.append(
            "Pages with impressions but weak CTR need stronger copy/internal linking: "
            + ", ".join(f"`{row_keys(row)[0]}`" for row in sample if row_keys(row))
        )

    return suggestions


def build_table_rows(rows: list[dict[str, Any]]) -> list[list[str]]:
    table_rows = []
    for row in rows:
        keys = row_keys(row)
        metrics = [
            format_number(row.get("clicks", 0.0)),
            format_number(row.get("impressions", 0.0)),
            f"{row.get('ctr', 0.0) * 100:.1f}%",
            f"{row.get('position', 0.0):.1f}",
        ]
        table_rows.append(keys + metrics)
    return table_rows


def main() -> int:
    site_url = os.getenv("GSC_PROPERTY_URL", "https://blastiic.com/").strip() or "https://blastiic.com/"
    credentials_file = env("GSC_CREDENTIALS_FILE")
    token = get_access_token(credentials_file)

    today = dt.date.today()
    end_date = today - dt.timedelta(days=3)
    start_date = end_date - dt.timedelta(days=6)

    base_body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "rowLimit": 10,
    }

    queries = query_search_console(
        token,
        site_url,
        {
            **base_body,
            "dimensions": ["query"],
        },
    ).get("rows", [])

    pages = query_search_console(
        token,
        site_url,
        {
            **base_body,
            "dimensions": ["page"],
        },
    ).get("rows", [])

    countries = query_search_console(
        token,
        site_url,
        {
            **base_body,
            "dimensions": ["country"],
        },
    ).get("rows", [])

    devices = query_search_console(
        token,
        site_url,
        {
            **base_body,
            "dimensions": ["device"],
        },
    ).get("rows", [])

    query_headers = ["Query", "Clicks", "Impressions", "CTR", "Position"]
    page_headers = ["Page", "Clicks", "Impressions", "CTR", "Position"]
    dimension_headers = ["Dimension", "Clicks", "Impressions", "CTR", "Position"]

    report = []
    report.append("# Weekly Search Console Insights\n")
    report.append(f"Property: `{site_url}`\n")
    report.append(
        f"Date window: `{start_date.isoformat()}` to `{end_date.isoformat()}`\n"
    )
    report.append(
        "_This window ends 3 days before today to avoid partial Search Console data._\n"
    )

    report.append("## Top queries\n")
    report.append(markdown_table(query_headers, build_table_rows(queries)))
    report.append("\n## Top pages\n")
    report.append(markdown_table(page_headers, build_table_rows(pages)))
    report.append("\n## Top countries\n")
    report.append(markdown_table(dimension_headers, build_table_rows(countries)))
    report.append("\n## Top devices\n")
    report.append(markdown_table(dimension_headers, build_table_rows(devices)))

    report.append("\n## Recommended actions\n")
    actions = summarize_queries(queries) + summarize_pages(pages)
    for action in actions:
        report.append(f"- {action}")

    report_text = "\n".join(report) + "\n"
    REPORT_FILE.write_text(report_text, encoding="utf-8")

    summary_file = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_file:
        Path(summary_file).write_text(report_text, encoding="utf-8")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover
        REPORT_FILE.write_text(
            "# Weekly Search Console Insights\n\n"
            f"- FAIL: {exc}\n\n"
            "Check the workflow secrets, service account access, and property URL.\n",
            encoding="utf-8",
        )
        summary_file = os.getenv("GITHUB_STEP_SUMMARY")
        if summary_file:
            Path(summary_file).write_text(REPORT_FILE.read_text(encoding="utf-8"), encoding="utf-8")
        raise
