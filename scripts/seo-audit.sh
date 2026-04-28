#!/usr/bin/env bash

set -euo pipefail

SITE_URL="${SITE_URL:-https://blastiic.com}"
REPORT_FILE="seo-audit-report.md"
FAILURES=0
WARNINGS=0
TMP_DIR="$(mktemp -d)"
HTML_FILE="$TMP_DIR/index.html"
ROBOTS_FILE="$TMP_DIR/robots.txt"
SITEMAP_FILE="$TMP_DIR/sitemap.xml"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

fetch() {
  local url="$1"
  local output="$2"
  curl -fsSL "$url" -o "$output"
}

pass() {
  printf -- "- PASS: %s\n" "$1" >> "$REPORT_FILE"
}

warn() {
  WARNINGS=$((WARNINGS + 1))
  printf -- "- WARN: %s\n" "$1" >> "$REPORT_FILE"
}

fail() {
  FAILURES=$((FAILURES + 1))
  printf -- "- FAIL: %s\n" "$1" >> "$REPORT_FILE"
}

extract_meta() {
  local name="$1"
  grep -oiE "<meta[^>]+${name}\"?[^>]+content=\"[^\"]*\"" "$HTML_FILE" | head -n 1 | sed -E 's/.*content=\"([^\"]*)\".*/\1/'
}

extract_title() {
  grep -oiE "<title>[^<]+</title>" "$HTML_FILE" | head -n 1 | sed -E 's/<\/?title>//g'
}

extract_canonical() {
  grep -oiE '<link[^>]+rel="canonical"[^>]+href="[^"]+"' "$HTML_FILE" | head -n 1 | sed -E 's/.*href="([^"]+)".*/\1/'
}

contains() {
  local file="$1"
  local needle="$2"
  grep -q "$needle" "$file"
}

printf "# Weekly SEO Audit\n\n" > "$REPORT_FILE"
printf "Site: %s\n\n" "$SITE_URL" >> "$REPORT_FILE"
printf "Date: %s\n\n" "$(date -u +"%Y-%m-%d %H:%M UTC")" >> "$REPORT_FILE"

fetch "$SITE_URL/" "$HTML_FILE"
fetch "$SITE_URL/robots.txt" "$ROBOTS_FILE"
fetch "$SITE_URL/sitemap.xml" "$SITEMAP_FILE"

TITLE="$(extract_title)"
DESCRIPTION="$(extract_meta 'name="description')"
OG_TITLE="$(extract_meta 'property="og:title')"
OG_DESCRIPTION="$(extract_meta 'property="og:description')"
CANONICAL="$(extract_canonical)"

if [[ -n "$TITLE" && "$TITLE" == *"BLASTIIC"* ]]; then
  pass "Title exists and contains BLASTIIC."
else
  fail "Title is missing or does not contain BLASTIIC."
fi

if [[ -n "$DESCRIPTION" ]]; then
  DESCRIPTION_LEN=${#DESCRIPTION}
  if (( DESCRIPTION_LEN >= 110 && DESCRIPTION_LEN <= 170 )); then
    pass "Meta description length looks healthy (${DESCRIPTION_LEN} chars)."
  else
    warn "Meta description length is ${DESCRIPTION_LEN} chars. Aim for 110-170."
  fi
else
  fail "Meta description is missing."
fi

if [[ "$CANONICAL" == "https://blastiic.com/" ]]; then
  pass "Canonical URL points to the main domain."
else
  fail "Canonical URL is incorrect or missing."
fi

if [[ -n "$OG_TITLE" && -n "$OG_DESCRIPTION" ]]; then
  pass "Open Graph title and description are present."
else
  fail "Open Graph metadata is incomplete."
fi

if contains "$HTML_FILE" 'MusicGroup'; then
  pass "Structured data for the artist is present."
else
  fail "Structured data for the artist is missing."
fi

if contains "$HTML_FILE" 'spotify.com' && contains "$HTML_FILE" 'instagram.com' && contains "$HTML_FILE" 'youtube.com' && contains "$HTML_FILE" 'soundcloud.com'; then
  pass "Main music and social links are present on the homepage."
else
  warn "One or more core profile links are missing on the homepage."
fi

if contains "$ROBOTS_FILE" 'Sitemap: https://blastiic.com/sitemap.xml'; then
  pass "robots.txt exposes the sitemap."
else
  fail "robots.txt does not expose the sitemap."
fi

if contains "$SITEMAP_FILE" 'https://blastiic.com/' && contains "$SITEMAP_FILE" 'https://blastiic.com/about.html' && contains "$SITEMAP_FILE" 'https://blastiic.com/music.html'; then
  pass "Sitemap includes the core pages."
else
  fail "Sitemap is missing one or more core pages."
fi

printf "\n## Next actions\n\n" >> "$REPORT_FILE"

if (( FAILURES == 0 && WARNINGS == 0 )); then
  printf -- "- No immediate SEO issues detected in the weekly audit.\n" >> "$REPORT_FILE"
elif (( FAILURES == 0 )); then
  printf -- "- Review the warnings above and tighten the copy or metadata where needed.\n" >> "$REPORT_FILE"
else
  printf -- "- Fix the failing items above first, then rerun the workflow from GitHub Actions.\n" >> "$REPORT_FILE"
fi

printf "\n## Promotion work that stays manual\n\n" >> "$REPORT_FILE"
printf -- "- Add new releases and updates to the site when music drops.\n" >> "$REPORT_FILE"
printf -- "- Keep BLASTIIC bios aligned across Spotify, Instagram, YouTube, Facebook, and SoundCloud.\n" >> "$REPORT_FILE"
printf -- "- Keep building backlinks and mentions from playlists, blogs, event pages, and social posts.\n" >> "$REPORT_FILE"

cat "$REPORT_FILE" >> "$GITHUB_STEP_SUMMARY"

if (( FAILURES > 0 )); then
  exit 1
fi
