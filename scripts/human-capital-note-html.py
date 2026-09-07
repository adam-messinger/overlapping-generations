#!/usr/bin/env python3
"""Render docs/HUMAN_CAPITAL_TRAJECTORY.md (headings, paragraphs, tables, lists,
inline code/bold/italic/links, and ![..](file.svg) figures inlined) to a
self-contained HTML page for printing to PDF, e.g.:

  python3 scripts/human-capital-note-html.py docs/HUMAN_CAPITAL_TRAJECTORY.md > /tmp/note.html
  chromium --headless=new --no-pdf-header-footer --print-to-pdf=docs/HUMAN_CAPITAL_TRAJECTORY.pdf file:///tmp/note.html
"""
import re, sys, html, os
src = open(sys.argv[1]).read().split('\n'); base = os.path.dirname(os.path.abspath(sys.argv[1]))
def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*([^*]+)\*(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
    return t
out=[]; i=0; para=[]; mode=None
def flush():
    global para
    if para: out.append('<p>'+inline(' '.join(s.strip() for s in para))+'</p>'); para=[]
while i < len(src):
    l = src[i]
    mimg = re.match(r'^!\[([^\]]*)\]\(([^)]+)\)\s*$', l)
    if mimg:
        flush(); svg = open(os.path.join(base, mimg.group(2))).read()
        svg = re.sub(r'<svg ', '<svg style="width:100%;height:auto" ', svg, count=1)
        out.append(f'<figure>{svg}<figcaption>{inline(mimg.group(1))}</figcaption></figure>'); i+=1; continue
    if l.startswith('#'):
        flush(); n=len(l)-len(l.lstrip('#')); out.append(f'<h{n}>{inline(l[n:].strip())}</h{n}>'); i+=1; continue
    if l.startswith('|'):
        flush(); rows=[]
        while i < len(src) and src[i].startswith('|'):
            cells=[c.strip() for c in src[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?', c) for c in cells): rows.append(cells)
            i+=1
        t=['<table>','<thead><tr>'+''.join(f'<th>{inline(c)}</th>' for c in rows[0])+'</tr></thead>','<tbody>']
        for r in rows[1:]:
            t.append('<tr>'+''.join(f'<td class="{"num" if re.fullmatch(r"[-+]?[0-9.,]+%?[xM]?", c) or c=="" or c=="never" else ""}">{inline(c)}</td>' for c in r)+'</tr>')
        t.append('</tbody></table>'); out.extend(t); continue
    m = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)', l)
    if m:
        flush(); ordered = m.group(2)[0].isdigit(); items=[]
        while i < len(src):
            m2 = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)', src[i])
            if m2: items.append(m2.group(3)); i+=1
            elif src[i].startswith('  ') and items: items[-1]+=' '+src[i].strip(); i+=1
            else: break
        tag='ol' if ordered else 'ul'
        out.append(f'<{tag}>'+''.join(f'<li>{inline(x)}</li>' for x in items)+f'</{tag}>'); continue
    if l.strip()=='': flush(); i+=1; continue
    para.append(l); i+=1
flush()
css = """
@page { size: Letter; margin: 0.9in 0.85in; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.42; color: #1a1a1a; max-width: 100%; }
h1 { font-size: 20pt; margin: 0 0 6pt; line-height: 1.2; }
h2 { font-size: 13.5pt; margin: 18pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 2pt; }
p { margin: 0 0 8pt; text-align: justify; }
h1 + p em { color: #555; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 8.6pt; font-family: Helvetica, Arial, sans-serif; page-break-inside: avoid; }
th, td { border-bottom: 1px solid #ccc; padding: 3pt 4pt; text-align: left; vertical-align: top; }
th { border-bottom: 1.5px solid #333; font-weight: 600; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
th:not(:first-child) { text-align: right; }
code { font-family: Menlo, Consolas, monospace; font-size: 8.8pt; background: #f2f2f2; padding: 0 2pt; }
ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
li { margin-bottom: 4pt; }
a { color: #1a1a1a; text-decoration: none; }
figure { margin: 8pt 0 10pt; page-break-inside: avoid; }
figcaption { font-size: 8.5pt; color: #555; font-family: Helvetica, Arial, sans-serif; margin-top: 2pt; }
"""
print(f'<!doctype html><html><head><meta charset="utf-8"><title>Are We Building Up or Drawing Down Human Capital?</title><style>{css}</style></head><body>' + '\n'.join(out) + '</body></html>')
