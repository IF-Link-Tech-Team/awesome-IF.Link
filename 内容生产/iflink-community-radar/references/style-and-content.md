# IF.Link 社区雷达 Style And Content Guide

## Brand

- Slogan: `Link the IFs, Connect the Dots.`
- Community label: `IF.Linker AI 交流群`
- Brand colors:
  - Main green: `#B1FA63`
  - Orange: `#FE7733`
  - Purple: `#B2A1FF`
- Dark infographic direction:
  - Background near `#10120F`
  - Cards near `#191D17` / `#20251D`
  - Text near `#F5F7F0`
- Fresh infographic direction:
  - Paper background near `#FBFAF5`
  - Black text/cards near `#211D1F`
  - Use green/orange/purple as bold blocks, not gradients.
- Fonts:
  - Chinese: Source Han Sans / 思源黑体 class
  - English headline: Google Sans Flex
  - English body: Inter
- Logo: use the official IF.Link SVG/PNG from the working folder. Do not redraw it or add an icon before `IF.Link`.

## Infographic Preferences

- Mobile-first vertical long image, export width around `1080px`.
- When continuing a daily series, inspect the previous local HTML/PNG first and match its visual family. Do not switch between dark and fresh styles without user direction.
- For the dark/black direction, use a near-black background, dense useful cards, high-contrast white text, and IF.Link green/orange/purple accents. Avoid making it look like a generic AI poster or a light paper report.
- Use a bold, clear H1. Prefer “AI 讨论火热”, not generic “讨论聊开”.
- Bento/card layout is fine, but avoid generic AI poster language.
- Keep content dense enough to be useful, but not a text wall.
- Use icon + short heading for modules. Icons must serve comprehension.
- CTA should be compact: `欢迎加入 IF.Linker AI 交流群，联系值班管理员加入。`
- If removing a side box, widen the text area instead of leaving empty space.
- Do not add decorative gradient orbs, bokeh blobs, or vague AI imagery.
- Screenshot-check for alignment, text fit, colors, logo, hierarchy, and mobile readability.

## Feishu Document Preferences

- The Feishu doc is the knowledge base, not a process log.
- Keep the opening clean: title, short framing, directory navigation, then the infographic under `0. 速览`.
- Avoid large operational metadata tables unless requested.
- Preserve the user's manual visual styling as content infrastructure:
  - different heading levels may have distinct colors or bold treatments,
  - directory/TOC or readonly helper blocks should remain in place,
  - links may be presented as bookmark cards instead of plain URLs,
  - project sections may include screenshots, image grids, or Feishu link cards.
- Before editing an existing radar doc, fetch the latest Feishu state. Prefer full/detail or XML-style snapshots when styles and blocks matter; avoid Markdown overwrite flows that flatten styling.
- Feishu CLI can fetch specific known `revision_id` snapshots, which is useful for comparing broad changes. Do not rely on it as a complete UI-like edit history.
- Preferred final order:
  1. opening/framing block
  2. directory navigation
  3. `0. 速览`
  4. `1. 阅读入口`
  5. `2. 项目雷达`
  6. `3. 话题雷达`
  7. `4. 高质量内容与资源索引`
- The directory navigation should be a visible manual block, not only the app sidebar outline. A compact two-column table works well: left column section links, right column reading purpose.
- Link directory items to section anchors when block IDs are available. If anchors are not stable yet, insert the directory after final headings exist, then verify links by fetching the final XML.
- Use green, bold H1 styling and orange, bold H2 styling when matching the established radar Feishu style. Plain XML with unstyled `<h1>` / `<h2>` is insufficient for this series; generate or patch styled XML and read it back before calling the document final.
  - H1 pattern: `<h1><b><span text-color="rgb(46,161,33)">0. 速览</span></b></h1>`
  - H2 pattern: `<h2><b><span text-color="rgb(222,120,2)">2.1 项目名</span></b></h2>`
- If you patch headings after building the directory, rebuild the directory anchor links because Feishu assigns new block IDs to replacement heading blocks.
- Put the infographic directly below `0. 速览` and keep it centered and wide enough for reading, typically around width `700` in Feishu.
- Put `项目雷达` before `话题雷达` when concrete repos, demos, screenshots, or products were shared.
- For projects:
  - Add bookmark cards or screenshots where useful.
  - Explain what the project is, who it helps, and why it mattered in the group.
  - Include GitHub/demo/site links.
- For topics:
  - Turn discussion into reusable methods, checklists, prompts, or decision rules.
  - Keep `群聊里聊到了什么` as a short setup, then move quickly into usable content.
  - Use tables and ordered lists to improve scanability.
- For external context:
  - Use quote blocks titled `资料补充：...` or `项目补充`.
  - Include links in the quote block.
  - Mark uncertain media-only claims as uncertain; do not write them as stable product facts.

## Content Filters

Cut or compress:

- member timelines and member portraits unless the user asks for them,
- “建议后续沉淀为...” sections,
- repeated summaries of the same topic,
- legal-record style “A 说 / B 说 / C 又说”,
- meta explanations about how the document was produced.

Keep:

- projects with links,
- tool workflows,
- prompts that can be reused,
- high-signal opinions with practical value,
- community flavor when it helps invite people in.

## Model And Tool Research

- Treat AI model/tool version freshness as a hard requirement.
- Search latest official pages first: docs, model cards, GitHub repos, releases, provider model lists, and official blogs.
- For Qwen, Claude, Gemini, GLM, Kimi, Grok, OpenAI/Codex, Trae, Fable, and similar fast-moving tools, never assume an older model generation is current.
- For closed or hosted models, prefer wording like `以官方控制台/模型列表实时可用入口为准`.
- If the latest public evidence is incomplete, say so briefly and link what can be verified.
