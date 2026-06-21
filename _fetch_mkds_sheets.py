"""Fetch MKDS circuit map asset pages and find CDN URLs."""

import requests
import re

# First, get the main game page to find the circuit map sheet IDs
page_url = "https://www.spriters-resource.com/ds_dsi/mariokartds/"
headers = {"User-Agent": "Mozilla/5.0"}

r = requests.get(page_url, headers=headers, timeout=15)
html = r.text

# Find all links to circuit map sheets
# Pattern: href="/ds_dsi/mariokartds/sheet/NNNNN/"
matches = re.findall(r'href="(/ds_dsi/mariokartds/sheet/\d+/)"[^>]*>([^<]+ Map)<', html)

print("Found circuit map links:")
for path, name in matches:
    print(f"  {name}: {path}")

# Also look for raw CDN image URLs
img_matches = re.findall(
    r'https?://textures\.spriters-resource\.com[^"\'\\]+\.png', html
)
print(f"\nFound {len(img_matches)} CDN image URLs:")
for url in set(img_matches):
    print(f"  {url}")
