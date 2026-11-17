"""Собирает однофайловую версию dist/glifomat.html (CSS и JS внутри) —
для артефакта в claude.ai и для офлайн-пересылки одним файлом.
Запуск: python3 tools/build.py"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "css/style.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + css + "</style>")
for name in ("engine", "app"):
    js = (root / f"js/{name}.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
    html = html.replace(f'<script src="js/{name}.js"></script>', "<script>\n" + js + "</script>")
assert "css/style.css" not in html and 'src="js/' not in html
out = root / "dist"; out.mkdir(exist_ok=True)
(out / "glifomat.html").write_text(html, encoding="utf-8")
print("dist/glifomat.html", len(html), "bytes")
