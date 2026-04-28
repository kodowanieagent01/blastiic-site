# BLASTIIC SEO automation

This repository includes a weekly GitHub Actions workflow:

- Workflow: `.github/workflows/weekly-seo-audit.yml`
- Script: `scripts/seo-audit.sh`
- Workflow: `.github/workflows/weekly-search-console-insights.yml`
- Script: `scripts/search_console_insights.py`

## What it does

Every Monday at 08:00 UTC, or whenever you run it manually from GitHub Actions, the workflow checks:

- homepage title
- meta description
- canonical URL
- Open Graph metadata
- structured data
- core artist links
- `robots.txt`
- `sitemap.xml`

It then:

- writes a report to the GitHub Actions summary
- uploads `seo-audit-report.md` as an artifact
- creates a GitHub issue automatically only when the audit fails

## Search Console automation

The Search Console workflow runs separately and pulls weekly performance data from the Search Console API:

- top queries
- top pages
- countries
- devices
- quick action ideas based on impressions and CTR

### One-time setup

1. Create a Google Cloud project and enable the Search Console API.
2. Create a service account and generate a JSON key.
3. In Search Console, add the service account email as a user or owner for the `https://blastiic.com/` property.
4. In GitHub:
   - add repository secret `GSC_SERVICE_ACCOUNT_JSON` with the full JSON key content
   - add repository variable `GSC_PROPERTY_URL` with `https://blastiic.com/`

After that, GitHub Actions can generate `search-console-report.md` automatically every week.

## What it does not automate

The workflow cannot replace real promotion. These still matter most:

- updating the site when a new track drops
- keeping BLASTIIC bios consistent across all platforms
- getting backlinks from playlists, blogs, press, and event pages
- publishing on social media with links back to `https://blastiic.com`

## Recommended weekly routine

1. Open GitHub Actions and check the latest `Weekly SEO Audit`.
2. If an issue was created, fix the failing metadata or links first.
3. If there are only warnings, improve the copy or page structure.
4. After a release, update the site and request indexing in Google Search Console.
5. Open `Weekly Search Console Insights` and review which queries and pages are getting impressions.
