---
name: ops-deploy
description: >
  SYS_v4 산출물 GitHub Pages 정적 배포 스킬. output/ + tickets/ + Dashboard를
  단일 정적 사이트로 묶어 클라이언트가 웹에서 열람할 수 있게 한다. Notion 게이트웨이 대체.
  외부 SaaS 의존 0 — GitHub Actions만 사용.
user-invocable: false
---

# Ops Deploy (GitHub Pages 자동 배포)

당신은 **SYS_v4 배포 자동화 운영자**입니다.
프로젝트 산출물(`output/`, `tickets/`, `Dashboard_*.html`)을 GitHub Pages로 정적 배포해 비개발자(클라이언트/디자이너)가 웹에서 열람·코멘트할 수 있는 게이트웨이를 만듭니다.

## 전제조건

- **필수**: 프로젝트 루트가 Git 워크트리 (`.git/` 존재)
- **필수**: GitHub repo 연결 (`git remote get-url origin`)
- **필수**: `output/` 또는 `tickets/` 산출물 존재
- **권장**: GitHub Pages 활성화 권한 (Settings → Pages → Source: GitHub Actions)

> Notion 대체 게이트웨이. 외부 API/토큰/네트워크 호출 없음. 전부 GitHub 인프라.

---

## 산출 구조

```
{프로젝트}/
├── .github/
│   └── workflows/
│       └── pages.yml           # GitHub Actions 배포 워크플로우 (생성)
├── docs/                       # GitHub Pages 루트 (생성/갱신)
│   ├── index.html              # 랜딩 — 프로젝트 개요 + 산출물 링크
│   ├── dashboard.html          # plan-dashboard 산출물 복사본
│   ├── tickets/
│   │   ├── index.html          # 칸반 뷰 (정적 HTML)
│   │   └── TKT-2026-0001.html  # 개별 티켓 (md → html 렌더)
│   ├── planning/               # output/planning/ 미러
│   ├── design/                 # output/design/ 미러
│   └── publish/                # output/publish/ 미러
└── output/                     # SSoT (변경 안 함)
```

> `docs/`가 SSoT가 아니라 **빌드 산출물**. 매 배포마다 `output/`로부터 재생성.

---

## 기능 1: Workflow 설치 (최초 1회)

`.github/workflows/pages.yml` 생성:

```yaml
name: Deploy SYS_v4 Pages
on:
  push:
    branches: [main]
    paths: ['output/**', 'tickets/**', 'PROJECT.md']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Build static site
        run: python .claude/scripts/ops-deploy/build.py
      - uses: actions/upload-pages-artifact@v3
        with: { path: docs/ }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 기능 2: Build 스크립트 (`.claude/scripts/ops-deploy/build.py`)

```python
"""SYS_v4 산출물 → docs/ 정적 사이트 빌드.
외부 의존 0: stdlib만 사용. markdown 렌더는 minimal converter."""

import json, pathlib, shutil, re, html, datetime, yaml

ROOT = pathlib.Path.cwd()
DOCS = ROOT / "docs"
OUTPUT = ROOT / "output"
TICKETS = ROOT / "tickets"

def main():
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir()

    project = load_project()
    mirror_output()
    build_tickets_index(project)
    build_landing(project)
    write_nojekyll()
    # LLM-friendly 인덱스 옵션 (2026-05-11 신설)
    # ops-config.json의 deploy.llms_txt: true 또는 빌드 환경변수 OPS_LLMS_TXT=1
    if should_build_llms_txt(project):
        build_llms_txt(project)
        build_llms_full_txt(project)

def load_project():
    pm = ROOT / "PROJECT.md"
    if not pm.exists():
        return {"name": ROOT.name, "code": "PRJ"}
    text = pm.read_text(encoding="utf-8")
    if text.startswith("---"):
        _, fm, _ = text.split("---", 2)
        return yaml.safe_load(fm) or {}
    return {"name": ROOT.name}

def mirror_output():
    for sub in ["planning", "design", "publish", "qa"]:
        src = OUTPUT / sub
        if src.exists():
            shutil.copytree(src, DOCS / sub)

def build_tickets_index(project):
    if not TICKETS.exists():
        return
    idx_path = TICKETS / "_index.json"
    if not idx_path.exists():
        return
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    out = DOCS / "tickets"
    out.mkdir(exist_ok=True)
    render_kanban(idx["tickets"], out / "index.html", project)
    for t in idx["tickets"]:
        md_path = TICKETS / f"{t['id']}.md"
        if md_path.exists():
            render_ticket(md_path, out / f"{t['id']}.html", project)

def render_kanban(tickets, dest, project):
    columns = {"open": [], "in-progress": [], "review": [], "done": []}
    for t in tickets:
        if t["status"] in columns:
            columns[t["status"]].append(t)
        elif t["status"] == "blocked":
            columns["in-progress"].append(t)
    cols_html = ""
    for status, items in columns.items():
        cards = "".join(
            f'<a class="card p{html.escape(t.get("priority","P2"))}" '
            f'href="{html.escape(t["id"])}.html">'
            f'<span class="prio">{html.escape(t.get("priority","P2"))}</span> '
            f'{html.escape(t["title"])}</a>'
            for t in items
        )
        cols_html += f'<section><h3>{status} ({len(items)})</h3>{cards}</section>'
    dest.write_text(KANBAN_TPL.format(
        title=html.escape(project.get("name", "Project")) + " — Tickets",
        columns=cols_html
    ), encoding="utf-8")

def render_ticket(md_path, dest, project):
    text = md_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    body_html = md_to_html(body)
    dest.write_text(TICKET_TPL.format(
        title=html.escape(fm.get("title", fm.get("id", "Ticket"))),
        id=html.escape(fm.get("id", "")),
        status=html.escape(fm.get("status", "")),
        priority=html.escape(fm.get("priority", "P2")),
        body=body_html,
    ), encoding="utf-8")

def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    _, fm_text, body = text.split("---", 2)
    return yaml.safe_load(fm_text) or {}, body.strip()

def md_to_html(md):
    """Minimal markdown converter — heading/list/link/code only."""
    lines = []
    in_code = False
    for line in md.split("\n"):
        if line.startswith("```"):
            lines.append("<pre><code>" if not in_code else "</code></pre>")
            in_code = not in_code
            continue
        if in_code:
            lines.append(html.escape(line))
            continue
        m = re.match(r"^(#{1,6})\s+(.+)$", line)
        if m:
            lvl = len(m.group(1))
            lines.append(f"<h{lvl}>{html.escape(m.group(2))}</h{lvl}>")
            continue
        if re.match(r"^[-*]\s+", line):
            lines.append(f"<li>{html.escape(line[2:])}</li>")
            continue
        line = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', html.escape(line))
        lines.append(f"<p>{line}</p>" if line else "")
    return "\n".join(lines)

def build_landing(project):
    name = project.get("name", "Project")
    sections = []
    for label, sub, desc in [
        ("Dashboard", "planning/Dashboard.html", "프로젝트 현황 요약"),
        ("Planning", "planning/", "QST/REQ/FN/IA/WBS/SB"),
        ("Design", "design/", "벤치마크/스타일/레이아웃/UI"),
        ("Publish", "publish/", "HTML/CSS/JS"),
        ("QA", "qa/", "기능/접근성/성능/보안 리포트"),
        ("Tickets", "tickets/", "이슈/변경/문의 칸반"),
    ]:
        target = DOCS / sub
        if target.exists() or any(DOCS.glob(f"{sub.rstrip('/')}*")):
            sections.append(
                f'<a class="tile" href="{sub}"><h3>{label}</h3><p>{desc}</p></a>'
            )
    (DOCS / "index.html").write_text(LANDING_TPL.format(
        title=html.escape(name),
        tiles="".join(sections),
        updated=datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    ), encoding="utf-8")

def write_nojekyll():
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")

# ─────────────────────────────────────────────────────────
# LLM-friendly 인덱스 (2026-05-11 신설, deep-documentation 패턴 차용)
# 동등 자산 grep 결과(2026-05-11): _handoff.md는 단계 인계용. 외부 LLM ingest 표준 부재.
# ─────────────────────────────────────────────────────────

def should_build_llms_txt(project):
    """ops-config.json deploy.llms_txt: true 또는 환경변수 OPS_LLMS_TXT=1"""
    import os
    if os.environ.get("OPS_LLMS_TXT") == "1":
        return True
    cfg = ROOT / "ops-config.json"
    if cfg.exists():
        try:
            data = json.loads(cfg.read_text(encoding="utf-8"))
            return bool(data.get("deploy", {}).get("llms_txt", False))
        except Exception:
            return False
    return False

def build_llms_txt(project):
    """docs/llms.txt — 간결 LLM 인덱스 (외부 LLM crawler 친화)"""
    name = project.get("name") or project.get("project_name") or ROOT.name
    code = project.get("code") or project.get("project_code") or "PRJ"
    url = project.get("url", "")
    domain = project.get("domain", "")

    lines = [
        f"# {name} ({code})",
        "",
        f"> SYS_v4 자동화 시스템 산출물 정적 사이트.",
        f"> 도메인: {domain or 'N/A'} · URL: {url or 'N/A'}",
        f"> 생성: {datetime.datetime.now().astimezone().isoformat(timespec='seconds')}",
        "",
        "## 산출물 인덱스",
        "",
    ]

    # 단계별 산출물 디렉토리 매핑
    stages = [
        ("planning", "기획 (QST / REQ / FN / IA / WBS / Dashboard / Persona / SB)"),
        ("design", "디자인 (Benchmark / Knowledge / Layout / UI / Replicate / DKB)"),
        ("publish", "퍼블리싱 (Markup / Style / Interaction / Visual-Verify)"),
        ("qa", "QA (Functional / A11y / Performance / Lighthouse / Security)"),
    ]
    for stage, desc in stages:
        stage_dir = DOCS / stage
        if not stage_dir.exists():
            continue
        lines.append(f"### /{stage}/ — {desc}")
        lines.append("")
        for f in sorted(stage_dir.rglob("*.md")):
            rel = f.relative_to(DOCS)
            lines.append(f"- [{f.stem}](/{rel.as_posix()})")
        lines.append("")

    # 티켓 인덱스
    tickets_idx = DOCS / "tickets" / "index.html"
    if tickets_idx.exists():
        lines.extend([
            "## 운영 티켓",
            "",
            "- [티켓 보드](/tickets/) — internal-ticket 기반 (분기 D⁺ SSoT)",
            "",
        ])

    # 핸드오프 인덱스 (Decision Log 포함 시)
    lines.extend([
        "## 핸드오프 메타",
        "",
        "단계별 `_handoff.md`는 META 블록 + decisions[] 필드를 포함합니다.",
        "스키마: lib/rules/handoff-schema.md (외부 공개 시 별도 문의)",
        "",
        "## 더 보기",
        "",
        "- 전체 번들: [llms-full.txt](/llms-full.txt)",
        "- 사람용 인덱스: [/](/) (랜딩)",
    ])

    (DOCS / "llms.txt").write_text("\n".join(lines), encoding="utf-8")

def build_llms_full_txt(project):
    """docs/llms-full.txt — 단일 번들 (LLM ingest 친화)"""
    name = project.get("name") or project.get("project_name") or ROOT.name
    parts = [f"# {name} — Full Documentation Bundle\n"]

    # 모든 산출물 .md 내용을 단일 번들로 (구분자: file:path)
    for stage in ["planning", "design", "publish", "qa"]:
        stage_dir = DOCS / stage
        if not stage_dir.exists():
            continue
        parts.append(f"\n\n{'=' * 70}\n## STAGE: {stage}\n{'=' * 70}\n")
        for f in sorted(stage_dir.rglob("*.md")):
            rel = f.relative_to(DOCS).as_posix()
            parts.append(f"\n\n--- file: /{rel} ---\n\n")
            try:
                parts.append(f.read_text(encoding="utf-8"))
            except Exception as e:
                parts.append(f"[read error: {e}]")

    (DOCS / "llms-full.txt").write_text("".join(parts), encoding="utf-8")

LANDING_TPL = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="manifest" href="/manifest.webmanifest">
<style>
:root{{--bg:#fff;--fg:#1a1a1a;--mut:#666;--brd:#e5e5e5;--accent:#2563eb}}
*{{box-sizing:border-box}}body{{font-family:-apple-system,Segoe UI,system-ui,sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:2rem;max-width:1100px;margin-inline:auto}}
h1{{font-size:1.75rem;margin:0 0 0.25rem}}p.sub{{color:var(--mut);margin:0 0 2rem}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}}
.tile{{display:block;padding:1.25rem;border:1px solid var(--brd);border-radius:8px;text-decoration:none;color:inherit;transition:.15s}}
.tile:hover{{border-color:var(--accent);transform:translateY(-2px)}}
.tile h3{{margin:0 0 0.5rem;font-size:1.1rem}}.tile p{{margin:0;color:var(--mut);font-size:0.9rem}}
footer{{margin-top:3rem;color:var(--mut);font-size:0.85rem;border-top:1px solid var(--brd);padding-top:1rem}}
</style></head><body>
<h1>{title}</h1><p class="sub">SYS_v4 산출물 게이트웨이</p>
<div class="grid">{tiles}</div>
<footer>최종 갱신: {updated}</footer>
</body></html>"""

KANBAN_TPL = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<style>
:root{{--bg:#fff;--fg:#1a1a1a;--mut:#666;--brd:#e5e5e5;--p0:#dc2626;--p1:#ea580c;--p2:#2563eb;--p3:#737373}}
*{{box-sizing:border-box}}body{{font-family:-apple-system,Segoe UI,system-ui,sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:1.5rem}}
h1{{font-size:1.5rem;margin:0 0 1.5rem}}.board{{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}}
@media(max-width:900px){{.board{{grid-template-columns:1fr}}}}
section{{background:#f9fafb;border:1px solid var(--brd);border-radius:8px;padding:0.75rem}}
section h3{{margin:0 0 0.75rem;font-size:0.95rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mut)}}
.card{{display:block;padding:0.6rem;background:#fff;border:1px solid var(--brd);border-left-width:3px;border-radius:4px;margin-bottom:0.5rem;text-decoration:none;color:inherit;font-size:0.9rem}}
.card.pP0{{border-left-color:var(--p0)}}.card.pP1{{border-left-color:var(--p1)}}
.card.pP2{{border-left-color:var(--p2)}}.card.pP3{{border-left-color:var(--p3)}}
.prio{{font-size:0.75rem;color:var(--mut);font-weight:600}}
nav{{margin-bottom:1rem}}nav a{{color:var(--mut);text-decoration:none}}
</style></head><body>
<nav><a href="../">← 홈</a></nav><h1>{title}</h1>
<div class="board">{columns}</div>
</body></html>"""

TICKET_TPL = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<style>
body{{font-family:-apple-system,Segoe UI,system-ui,sans-serif;max-width:780px;margin:2rem auto;padding:0 1.5rem;color:#1a1a1a}}
.meta{{color:#666;font-size:0.9rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #e5e5e5}}
.tag{{display:inline-block;padding:0.15rem 0.5rem;background:#f3f4f6;border-radius:3px;font-size:0.8rem;margin-right:0.5rem}}
nav a{{color:#666;text-decoration:none}}pre{{background:#f9fafb;padding:1rem;border-radius:4px;overflow-x:auto}}
</style></head><body>
<nav><a href="index.html">← Tickets</a></nav>
<h1>{title}</h1>
<div class="meta"><span class="tag">{id}</span><span class="tag">{status}</span><span class="tag">{priority}</span></div>
{body}
</body></html>"""

if __name__ == "__main__":
    main()
```

## 기능 3: Giscus 댓글 (옵션)

비개발자가 산출물에 댓글을 남기는 통로. GitHub Discussions가 백엔드.

### 사전 설정 (1회)

1. GitHub repo Settings → General → Features → **Discussions** 활성화
2. https://giscus.app 에서 repo 선택 → 카테고리(Announcements 권장) 선택
3. 발급된 `data-repo-id`/`data-category-id` 를 `PROJECT.md` 에 기록:

```yaml
---
name: 비짓강남
code: VGN
giscus:
  repo: eluoaxjun/visitgangnam
  repo_id: R_kgDOxxxxx
  category: Comments
  category_id: DIC_kwDOxxxxx
---
```

### Build 스크립트 통합

`build.py`의 `TICKET_TPL` 하단에 Giscus 컨테이너 + 스크립트 삽입:

```python
GISCUS_SNIPPET = """
<section id="comments" style="margin-top:3rem;border-top:1px solid #e5e5e5;padding-top:2rem">
<h2 style="font-size:1.1rem;color:#666">Comments</h2>
<script src="https://giscus.app/client.js"
  data-repo="{repo}"
  data-repo-id="{repo_id}"
  data-category="{category}"
  data-category-id="{category_id}"
  data-mapping="pathname"
  data-strict="1"
  data-reactions-enabled="1"
  data-emit-metadata="0"
  data-input-position="top"
  data-theme="light"
  data-lang="ko"
  crossorigin="anonymous" async></script>
</section>
"""

def render_ticket(md_path, dest, project):
    text = md_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    body_html = md_to_html(body)
    giscus = ""
    if g := project.get("giscus"):
        giscus = GISCUS_SNIPPET.format(
            repo=g["repo"], repo_id=g["repo_id"],
            category=g["category"], category_id=g["category_id"],
        )
    dest.write_text(TICKET_TPL.format(
        title=html.escape(fm.get("title", fm.get("id", "Ticket"))),
        id=html.escape(fm.get("id", "")),
        status=html.escape(fm.get("status", "")),
        priority=html.escape(fm.get("priority", "P2")),
        body=body_html + giscus,
    ), encoding="utf-8")
```

> **위치 정책**: 댓글은 **티켓 페이지에만** 표시 (개별 산출물·dashboard에는 미표시). 의도: 코멘트 동선을 티켓에 집중 → 자동 이슈 트래킹 가능.
> **개인정보**: Giscus는 GitHub 계정 OAuth만 사용. 익명 코멘트 불가 (의도된 보호 장치).
> **외부 의존**: giscus.app/client.js (CDN 1회 로드) — 다른 외부 호출 없음.

## 기능 4: PWA (모바일 통로)

비개발자가 모바일에서 산출물을 빠르게 열고, 오프라인에서도 마지막 본 페이지를 다시 볼 수 있게 한다.

### manifest.webmanifest

`build.py`가 `docs/manifest.webmanifest` 자동 생성:

```python
def write_pwa(project):
    manifest = {
        "name": project.get("name", "SYS_v4 Project"),
        "short_name": (project.get("code") or project.get("name", "SYS"))[:12],
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": project.get("theme_color", "#2563eb"),
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}
        ],
        "lang": "ko",
        "orientation": "portrait-primary"
    }
    (DOCS / "manifest.webmanifest").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DOCS / "sw.js").write_text(SW_JS, encoding="utf-8")
    # 아이콘은 사용자가 docs/icon-192.png, icon-512.png 로 직접 배치
```

### service worker (`sw.js`)

```javascript
const CACHE = 'sys-v4-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 외부 호출(Giscus) 미캐시
  e.respondWith(
    caches.match(e.request).then(hit => {
      const fresh = fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
```

> **stale-while-revalidate**: 캐시 우선 → 백그라운드 fetch → 다음 방문 시 최신 반영. 오프라인에서도 마지막 본 페이지 동작.

### Landing 페이지 등록

`LANDING_TPL`에 service worker 등록 스니펫 추가:

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
</script>
```

> **manifest 링크**: `LANDING_TPL` `<head>` 에 `<link rel="manifest" href="./manifest.webmanifest">` 이미 포함 (build.py).
> **아이콘**: `docs/icon-192.png`, `icon-512.png` 는 사용자가 직접 배치 (자동 생성 시 ImageMagick 의존 — 외부 의존 0 원칙 위배).
> **HTTPS 필수**: GitHub Pages는 기본 HTTPS — service worker 동작 보장.

## 기능 5: 로컬 빌드 (배포 전 검증)

```bash
python .claude/scripts/ops-deploy/build.py
# docs/ 생성 → 로컬 서버로 확인
python -m http.server 8080 -d docs
```

## 기능 4: 변경 감지 + PR 자동화 (옵션)

`figma-pull` Step 9 패턴 차용. 산출물 갱신 시:

1. `output/`/`tickets/` 변경 감지 (`git status --porcelain`)
2. 변경률 ≥ 1% 또는 신규 산출물 생성 시 새 브랜치 (`auto/deploy-{YYYYMMDD-HHMM}`)
3. 자동 커밋 (메시지: `chore(deploy): refresh artifacts {date}`)
4. `gh pr create` (있을 때만, 없으면 푸시만)

> 자동 PR은 옵션. 사용자가 `[ops-deploy:auto-pr]` 마커로 명시 동의 시만.

---

## 규칙

1. **`docs/`는 빌드 산출물** — 절대 SSoT 아님. 매 배포 시 재생성
2. **외부 의존 0** — stdlib + yaml(PROJECT.md 파싱)만 사용
3. **GitHub Pages 외 다른 호스팅 비추천** — 사용자 환경 친숙도 우선
4. **PROJECT.md 가 메타 SSoT** — name/code/client는 거기서만 읽음
5. **민감 정보 차단** — `.env`, `secrets/`, `tickets/_archive/private/` 는 빌드 제외

---

## Self-Check

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | workflow 파일 존재 | `.github/workflows/pages.yml` 존재 |
| 2 | build 스크립트 존재 | `.claude/scripts/ops-deploy/build.py` 존재 |
| 3 | docs/ 생성 검증 | 로컬 빌드 후 `docs/index.html` 생성 |
| 4 | 외부 호출 0 | 빌드 스크립트 내 `urllib`/`requests`/`subprocess` 호출 없음 (yaml 제외) |
| 5 | 민감 파일 제외 | `.env`/`secrets/` 가 docs/에 미포함 |

---

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 사용자 미확인 GitHub Pages 활성화 금지 | repo Settings 변경은 사용자 권한 |
| 2 | docs/ 수동 편집 금지 | 빌드로만 갱신 (SSoT 보호) |
| 3 | private repo 데이터를 public Pages에 배포 금지 | 정보 유출 방지. visibility 사전 확인 필수 |

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **visibility 미확인 배포**: `gh repo view`로 visibility 확인 없이 Pages 배포 → 정보 유출 위험. 첫 배포 전 의무 확인.
- ❌ **docs/ 직접 편집**: 빌드 우회로 docs/를 손으로 수정 → SSoT 무너짐. 다음 빌드에서 덮어쓰기. output/만 편집하고 빌드 재실행.
- ❌ **auth-gate 미적용 공개 배포**: 고객 정보·미공개 시안 포함 산출물을 public Pages에 auth-gate 없이 노출. visibility=public이면 auth-gate Tier-A 의무.
- ❌ **CNAME 누락**: custom domain 설정 후 빌드 산출물에 CNAME 파일 미포함 → 빌드마다 도메인 해제. CNAME 파일 빌드 포함 자동화.
- ❌ **base href 누락**: project pages(`/repo-name/`)에서 절대경로 사용 → 정적 자산 404. base href 또는 상대경로 자동 변환 필수.
- ❌ **빌드 캐시 미무효화**: tickets/_index.json 갱신했는데 캐시로 구버전 배포 → 변경 미반영. 캐시 무효화 옵션 명시.
