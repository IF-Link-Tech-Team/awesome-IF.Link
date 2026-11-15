---
name: iflink-community-radar
description: "Use when turning IF.Linker AI chat records into daily IF.Link 社区雷达 outputs: mobile infographic, Feishu knowledge document, WeChat forwarding copy, or wiki archive updates."
license: MIT
metadata:
  author: IF.Link
  maintainer: Last-emo-boy
  status: beta
  updated: "2026-11-15"
  source: https://github.com/IF-Link-Tech-Team/iflink-community-radar/tree/a083c18d0862f79ae0ea244633e607e15a6f58b9
---

# IF.Link Community Radar

## 运行依赖

Requires wx for chat export and authorized Feishu tools for document, wiki and Base operations.

Produce the daily IF.Link 社区雷达 as five coordinated artifacts:

1. a mobile-first information graphic for quick sharing,
2. a Feishu knowledge document for durable reading,
3. a short WeChat forwarding copy for the group,
4. a structured Feishu Base archive of newcomer self-introductions,
5. an enriched source digest for high-value links shared in the chat.

Use this skill when the user provides IF.Linker AI 交流群 chat records, asks for 社区雷达, asks to summarize a daily discussion, asks to update the newcomer self-introduction archive, or asks to update the radar wiki archive.

## Runtime inputs

Keep dated exports, source captures and generated documents outside this installed skill directory. The caller supplies the time window, output directory, and any existing document or Wiki homepage. For newcomer archiving, also supply the authorized Base URL/token and table ID; no organization-specific IDs are bundled. If those destinations are missing, produce the local deliverables and ask only for the destination needed for the pending write. Never guess a Base, table or Wiki target.

## Operating Principles

- Start from the actual local chat export, Feishu document, and project links. Do not summarize from memory.
- Preserve the settled public label: `IF.Linker AI 交流群`.
- Preserve newcomer raw self-introduction text as evidence in the Base; do not publish or rewrite private/raw intro text in public radar outputs unless the user explicitly asks.
- Treat AI model/tool facts as volatile. Search newest official docs, model pages, repos, releases, provider model lists, and recent credible sources before writing.
- If a GitHub/project/product link appears, open or search it and include the link in the Feishu doc.
- Treat external content links as first-class radar sources, not as plain chat decorations. In particular, WeChat Official Account links (`mp.weixin.qq.com`) and Xiaohongshu links (`xhslink.com`, `xiaohongshu.com`, `xhs.cn`) must be fetched, summarized, and considered when selecting radar topics.
- Separate group experience from external facts. Use `资料补充` / `项目补充` quote blocks with links.
- Write like a human editor: clear, compact, useful. Avoid process chatter such as “后续建议”, “联网补充”, “对未入群同学来说”, and repetitive restatement.
- Prefer material readers can use immediately: a method, prompt, checklist, project intro, or decision rule.
- When the user asks to align with yesterday or a previous radar, treat that previous Feishu doc and local HTML/PNG as the style source of truth. Do not switch visual systems, section order, or document structure unless the user asks.
- Preserve manual Feishu craft as a required part of quality: directory navigation, heading colors, bookmark cards, quote blocks, image placement, and resource tables are not optional polish.

## Workflow

1. **Collect sources**
   - Read local `chat.md`, `history_raw.json`, `members.json`, final image/HTML files, and any existing Feishu doc.
   - If the chat is still in WeChat, use the local `wx` command from the wx-cli toolchain, not `wx-cli`. First confirm the group with `wx sessions --json` or `wx contacts --query`, then export both Markdown and JSON:
     - `wx export "IF.Linker AI 交流群" --since "YYYY-MM-DD HH:mm" --until "YYYY-MM-DD HH:mm" -n 3000 --format markdown -o <date>/chat.md`
     - `wx export "IF.Linker AI 交流群" --since "YYYY-MM-DD HH:mm" --until "YYYY-MM-DD HH:mm" -n 3000 --format json -o <date>/history_raw.json`
     - `wx members "IF.Linker AI 交流群" --json > <date>/members.json`
   - Prefer the real group record over recollection or stale exports. After exporting, record both the requested time window and the actual first/last message times; if the requested window starts earlier than the first message, state that gap explicitly in the analysis.
   - Check `wx history "IF.Linker AI 交流群" --since ... --until ... --json --with-meta` when freshness matters. Treat `unknown_shards` or `possibly_stale` as a blocker that needs `wx init --force` or user help; `windowed` is expected for time-bounded queries.
   - Keep `wx` usage conservative: avoid unnecessary attachment/voice/image mass extraction unless the user explicitly needs media, because local experience shows aggressive WeChat data extraction can be account-risky.
   - Build a link inventory from both `chat.md` and `history_raw.json`. Record URL, normalized URL, platform, sender, message time, `local_id`, surrounding chat context, and whether it was successfully fetched. Do this before topic selection so forwarded articles can shape the issue.
   - For `mp.weixin.qq.com`, `xhslink.com`, `xiaohongshu.com`, and `xhs.cn` links, use the following platform fetch rules with the available browser tooling:
     - WeChat Official Account: use Playwright with system Chrome, scroll to the bottom, extract `#js_content` / `.rich_media_content`, collect `data-src` images, and keep the title/author/publish time when available.
     - Xiaohongshu: follow short-link redirects, extract `window.__INITIAL_STATE__`, parse the note body and images, and record when login or anti-bot restrictions prevent fetching.
   - Save fetched external-source artifacts in the dated radar folder, for example `external_sources/links.tsv`, `external_sources/<platform>-<local_id>.json`, and `external_sources/<platform>-<local_id>.md`. If a link cannot be fetched after reasonable retries, keep a failed row with the error reason; do not silently drop it.
   - Fetch the current Feishu doc and the `IF.Link 社区雷达` wiki homepage before editing.
   - When matching a previous issue, read the previous issue's Feishu doc plus its local HTML/PNG. Note its infographic style (for example black/dark vs fresh), section order, top blocks, directory/navigation block, heading colors, and link-card treatment before writing.
   - When Feishu styling matters, fetch a full/detail snapshot before editing and compare with older known revisions if available.
   - Check whether the user made manual edits in Feishu; treat the current Feishu document as the source of truth and preserve its visual layer.

2. **Extract signal**
   - Identify 4-6 reusable topics and 3-6 concrete projects/tools.
   - Read fetched WeChat Official Account and Xiaohongshu material alongside the group messages. Prefer links that generated discussion, contain reusable methods, provide concrete cases/resources, or explain a topic that the chat only mentioned briefly.
   - Distinguish the community's reaction from the external article's claims. Summarize forwarded content in your own words and cite the original link; do not present the article as if it were a group member's original statement.
   - De-prioritize member timelines, court-record style “谁说了什么”, raw stats, and inside jokes unless they explain the community flavor.
   - Put project radar before topic radar when there are concrete demos, repos, screenshots, or product links.
   - Extract newcomer self-introductions separately from public radar signal: keep raw intro messages, sender nickname, message time, `local_id`, parsed name, grade, school/unit, major/field, direction tags, tool/model tags, current work, hopes, connection cue, confidence, and review status.

3. **Update the newcomer self-introduction Base**
   - Use the Base and table supplied for this run; confirm their title and schema before writing. The expected table is the newcomer self-introduction archive, not a newly guessed destination.
   - Use `lark-cli base +record-list` first to read existing `消息ID/local_id` values, then only append missing intros with `+record-batch-create`; never duplicate a message already recorded.
   - Record one row per self-introduction. If the same person adds a direct intro supplement a few minutes later, merge it into the same row and set `消息ID/local_id` like `1187;1192`, with a note.
   - Store exact raw text in `原始文本`; parsing fields are editable derived data. Use `解析状态=需人工确认` and `解析置信度=中/低` for project-only introductions, truncated exports, nickname-derived names, or ambiguous grades.
   - Keep tag vocab conservative. Use existing select options when available; put rare tools/topics in `专业/领域原文`, `正在做/做过`, `可连接线索`, or `备注` instead of inventing new Base options during routine radar production.
   - Exclude admin prompts, welcomes, ordinary questions, quoted repeats, and follow-up discussion unless they are direct self-introduction supplements.
   - After writing, read back counts grouped by `雷达日期` and list `需人工确认` rows.

4. **Research**
   - For every model/tool/project with a specific name or link, read the actual source.
   - For every high-value WeChat Official Account or Xiaohongshu link, read the fetched article/note before deciding whether to include it. If the fetch only yields partial content, say so in the working notes and use cautious wording in the final radar.
   - Prefer official source first, then GitHub README/release, then credible recent media/community references.
   - For fast-moving models, state the verification date or use cautious wording like “以官方控制台/模型列表实时可用入口为准”.

5. **Create the infographic**
   - Use the brand and design rules in `references/style-and-content.md`.
   - Match the previous issue's visual direction when the user asks for continuity. If yesterday used the black/dark infographic, use the dark direction again; do not default to the fresh paper direction.
   - Build a single-file HTML/CSS, export PNG, then screenshot-check desktop/mobile readability.
   - For local HTML exports, Chrome CLI `--screenshot` may only capture the current viewport. Prefer a full-page CDP/Playwright-style capture that reads `Page.getLayoutMetrics` and captures beyond viewport, then verify image dimensions and nonblank pixels. Also test a narrow/mobile viewport; if cards stay in two columns, check `grid-column: span 2` and media-query breakpoints.
   - Keep the graphic scan-first: headline, 4-6 topic/project blocks, invitation CTA.

6. **Create the Feishu document**
   - Use XML-rich Feishu blocks for the final doc unless the user explicitly asks for Markdown. Avoid Markdown overwrite flows that flatten heading colors, bookmarks, image blocks, and manual styling.
   - XML-rich means styled XML, not plain `<h1>` / `<h2>` blocks. When continuing the current radar series, match the established heading treatment: green bold H1 such as `<h1><b><span text-color="rgb(46,161,33)">0. 速览</span></b></h1>` and orange bold H2 such as `<h2><b><span text-color="rgb(222,120,2)">2.1 项目名</span></b></h2>`.
   - Structure the doc as: short intro/framing block, directory navigation, `0. 速览`, `1. 阅读入口`, `2. 项目雷达`, `3. 话题雷达`, `4. 高质量内容与资源索引`.
   - Insert the infographic under `0. 速览` unless the previous issue clearly places it elsewhere.
   - Add a hand-made directory/navigation block near the top. It should link to the major section anchors and briefly tell readers what each section is for.
   - Use bookmarks/screenshots for important projects when available.
   - Include a concise `转发内容精选` / `高质量内容` treatment when external articles materially improved the issue: title, source platform, one-line value, why the group cared, and the original link. It can live under `1. 阅读入口`, the relevant project/topic section, or `4. 高质量内容与资源索引`, whichever makes the reading flow cleaner.
   - Expand each major item enough for a reader to understand and act, but avoid long essays.
   - After inserting media or preserving manual blocks, prefer local `block_insert_after`, `block_replace`, or `block_move_after` edits. Do not do another full overwrite unless rebuilding the whole page is intentional and all media/manual blocks will be restored.
   - Avoid running multiple Feishu block updates in parallel on the same document. Sequentially move/delete/replace blocks, then immediately read back the affected section. Parallel block updates can succeed while producing confusing revision ordering.
   - When creating a new daily Wiki child page, create it under the `IF.Link 社区雷达` homepage with `wiki +node-create`, write the docx content, insert the infographic with `docs +media-insert`, move the image under `0. 速览`, then replace the directory table with anchor links to the new Wiki URL plus section block IDs.
   - If heading blocks are replaced after anchor links are created, the heading block IDs change. Fetch the outline again and rebuild the directory/navigation links against the current heading IDs.

7. **Create WeChat copy**
   - Use `references/wechat-copy.md`.
   - Keep it short enough to send with the image and Feishu card.
   - Name the value of the day, list highlights, mention admin contact, and end with the full radar link placeholder.

8. **Archive**
   - Move the daily doc under the `IF.Link 社区雷达` wiki homepage as a child document.
   - Update the homepage with one dated link and a keyword summary under 200 Chinese characters.
   - Verify both the wiki child node and homepage content.
   - Use the wiki child URL in the homepage archive entry. If `drive +inspect` returns an underlying `/docx/` URL, do not use that docx URL as the public archive link.

## Required Checks

- Infographic uses the official logo asset, correct brand colors, and readable mobile typography.
- If a previous issue is the target style, the final infographic uses the same visual direction as that issue (for example dark/black rather than fresh/paper).
- Feishu edits preserve manual styling: heading colors, directory/TOC blocks, bookmark cards, image grids, screenshots, and link-card presentation.
- Final Feishu XML readback must show styled headings, not only correct outline text: verify H1/H2 include the expected `<b><span text-color="...">` wrappers, and verify directory links point to current heading block IDs.
- Feishu doc includes a top directory/navigation block before the main content sections.
- Feishu doc order is exactly: opening/framing, directory navigation, `0. 速览` with infographic, `1. 阅读入口`, `2. 项目雷达`, `3. 话题雷达`, `4. 高质量内容与资源索引`, unless the user asks otherwise.
- Feishu doc links resolve; project and GitHub links are not guessed.
- WeChat Official Account and Xiaohongshu links in the chat window are inventoried, attempted with the content-knowledge-pipeline fetch approach, and either integrated or explicitly marked as low-signal/failed in local notes. Do not omit them just because the raw chat text is thin.
- Model/tool versions are current as of the work date.
- When an authorized newcomer Base was supplied, update it for the issue's chat window and read back total written rows, per-date count, and rows needing manual confirmation. Otherwise report the pending archive destination without publishing raw intros elsewhere.
- The homepage archive link points to the wiki child URL, not an old drive/docx URL.
- WeChat copy matches the final doc and image, not an older draft.
- Verification must read back the final Feishu outline and the top section containing the directory/navigation block and infographic. Do not claim completion from write success alone.

## References

- Read `references/style-and-content.md` before designing or writing the Feishu doc.
- Read `references/wechat-copy.md` before drafting WeChat forwarding copy.
