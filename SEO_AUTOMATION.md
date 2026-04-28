# BLASTIIC SEO automation

This repository includes a weekly GitHub Actions workflow:

- Workflow: `.github/workflows/weekly-seo-audit.yml`
- Script: `scripts/seo-audit.sh`

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
