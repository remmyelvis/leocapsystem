"""Rebuild PLATFORM_IMPROVEMENTS.pdf from PLATFORM_IMPROVEMENTS.md (run it after every change to the .md).

Needs the `markdown` package (pip install markdown) and Google Chrome, which is used headless to print the page.
Usage, from anywhere:  python tools/build_improvements_pdf.py
"""
import pathlib
import re
import subprocess
import sys
import tempfile

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "PLATFORM_IMPROVEMENTS.md"
TARGET = ROOT / "PLATFORM_IMPROVEMENTS.pdf"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@page { size: A4; margin: 16mm 14mm 18mm 14mm; @bottom-center { content: "Leocap Invest platform: what has changed  |  page " counter(page); font: 8pt -apple-system, Helvetica, Arial, sans-serif; color: #64748b; } }
* { box-sizing: border-box; }
html { font: 9.6pt/1.5 -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; }
h1 { font-size: 22pt; line-height: 1.15; color: #0F2C59; margin: 0 0 4pt; letter-spacing: -0.01em; }
h1 + p { margin: 0 0 2pt; color: #475569; }
h2 { font-size: 14pt; color: #0F2C59; margin: 22pt 0 7pt; padding-bottom: 4pt; border-bottom: 2px solid #0F2C59; break-after: avoid; }
h3 { font-size: 11pt; color: #0F2C59; margin: 14pt 0 5pt; break-after: avoid; }
p, li { margin: 0 0 5pt; }
ul, ol { padding-left: 16pt; margin: 0 0 8pt; }
hr { border: 0; border-top: 1px solid #cbd5e1; margin: 14pt 0; }
a { color: #0F2C59; text-decoration: none; }
strong { color: #0f172a; }
code { font: 8.5pt ui-monospace, Menlo, monospace; background: #f1f5f9; padding: 0 3pt; border-radius: 3pt; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 8.6pt; line-height: 1.4; }
thead { display: table-header-group; }
th { background: #0F2C59; color: #fff; text-align: left; padding: 5pt 6pt; font-weight: 700; }
td { padding: 5pt 6pt; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
tr { break-inside: avoid; }
tbody tr:nth-child(even) td { background: #f8fafc; }
table td:first-child { color: #0f172a; }
blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 3px solid #0F2C59; background: #f1f5f9; }
"""


def main():
    body = markdown.markdown(SOURCE.read_text(encoding="utf-8"), extensions=["tables", "toc", "sane_lists"])
    # very short tables (and the "how a balance moves" one) stay on one page; long ones break between rows, header repeated
    body = re.sub(
        r"<table>(.*?)</table>",
        lambda m: ("<table style='break-inside: avoid'>" if (m.group(1).count("<tr>") <= 4 or "<th>Event</th>" in m.group(1)) else "<table>")
        + m.group(1) + "</table>",
        body, flags=re.S)
    # a date such as "25 Oct" or "21-22 Oct" never wraps onto two lines
    body = re.sub(r"<td>(<strong>)?(\d{1,2}(?:-\d{1,2})? [A-Z][a-z]{2})(</strong>)?</td>", r"<td style='white-space: nowrap'>\1\2\3</td>", body)
    html = ("<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Leocap Invest platform: what has changed</title>"
            f"<style>{CSS}</style></head><body>{body}</body></html>")
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / "page.html"
        page.write_text(html, encoding="utf-8")
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={TARGET}", page.as_uri()],
            check=True, capture_output=True)
    print(f"Wrote {TARGET} ({TARGET.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    sys.exit(main())
