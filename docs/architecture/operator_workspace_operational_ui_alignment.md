# Operator workspace — AF operational UI alignment (Sprint 020A)

## Purpose

This document fixes a **reference-alignment contract** for Review Flow company workspace UI:

```text
AF operational structure + NL visual language
```

It is intentionally **not** an implementation spec at the component/CSS level, and does **not** authorize page-by-page redesign.

## References reviewed

- AF-style structural references:
  - `docs/text-adm.png`
  - `docs/logs-adm.png`
- Review Flow canonical artifacts:
  - PROJECT_SOT: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
  - `IMPLEMENTATION_PLAN.md`
  - `docs/architecture/operational_discipline_assistant_flow_ru.md`
  - Sprint 020 Phase 0: `docs/cursor_sessions/2026-05-28_sprint_020_phase0_operational_workspace_bootstrap.md`

---

## Target visual style (NL-style, explicitly NOT AF-dark)

### Forbidden transfers from AF

- AF dark palette / dark console background
- neon-like green accents
- terminal-like aesthetic

### NL-style adaptation (required)

- light operational base (white / light-gray surfaces)
- thin borders, moderate shadows, calm enterprise look
- calm Northline Market tone
- color semantics:
  - green = success/positive
  - blue = primary operational action / selected state
  - orange = warning / medium priority
  - red = high/critical
  - gray = secondary metadata

---

## AF reference: what matters (structural patterns)

Across `text-adm.png` and `logs-adm.png`, the invariant operational structure is:

1) **Unified shell** (fixed left navigation + consistent content frame)  
2) **Split panel**: left list/workstream + right detail workspace  
3) **Toolbar-first interaction**: filters/search/refresh as a stable top zone of the list  
4) **Status-first hierarchy**: “what is selected / what is the outcome / what is the state” is always visible  
5) **Compact metadata**: key/value blocks, small status pills, no big whitespace  
6) **Request vs answer** separation: user input block distinct from system output  
7) **Timeline is first-class**: pipeline events/stages are visible and scannable  
8) **Expandable technical payload**: JSON/debug exists, but is not the primary UI layer

This is the structure to port — not the dark styling.

---

## Part 1 — Target structure of Review Flow operator console (exhaustive blocks)

### Global zones (operator console page)

1. Unified company shell
2. Sidebar navigation (role-aware)
3. Operator queue/list panel (left)
4. Review detail workspace (right)
5. Workspace header / quick actions (inside detail)
6. Customer request block
7. Classification / analysis block
8. Response processing block (AI Draft / Operator Revision / Published)
9. Pipeline timeline (lifecycle)
10. Internal notes / operator actions
11. Status + publication controls (lifecycle semantics)

---

## Part 2 — Unified company shell (company workspace)

### Required shell elements

- fixed/consistent sidebar
- workspace header (company contour, not marketing header/footer)
- role-aware navigation and active indicator
- compact section grouping (capability tree)
- consistent page container + predictable width/scroll behavior
- shared layout primitives (introduced shell-first)

### Sidebar semantics (capability tree)

Operator:
- Queue / worklist
- My tasks / assigned items (future, placeholder in nav model allowed)
- History / archive (future)

Administrator:
- Analytics
- Logs
- Prompts
- Evaluation
- Knowledge base
- AI providers

Invariant:
- Operator and Administrator are **roles inside one company workspace**, not separate “sites”.

---

## Part 3 — Queue/List panel (left)

### AF mapping

- AF “session list” (text console) → Review Flow “review/request queue”
- AF “execution list” (logs console) → Review Flow “operational events stream” (admin logs), but operator list is still queue

### Required list-panel structure

#### Toolbar (stable, scannable)

- time/status filters (if meaningful)
- moderation_status filter (mandatory)
- priority filter
- topic/scenario filter
- search input (request id / customer / text)
- refresh button

#### Queue item (dense but readable)

1. Primary line:
   - request number (`NL-XXXXXXXX-NNN`)
   - customer name
   - timestamp
2. Semantic line:
   - topic/scenario
   - sentiment
   - priority
3. Preview line:
   - short request excerpt
4. Status indicators:
   - moderation status
   - publication status
   - AI draft status (exists/failed/fallback)
   - assignment (if exists)
5. Visual accents:
   - selected state
   - priority marker
   - status badge/pill

### Queue invariants

- **Operational density** for scanning (no giant whitespace).
- Must remain readable (avoid telemetry blob).
- Must preserve fetch state semantics:
  - loading ≠ error ≠ empty ≠ loaded.

---

## Part 4 — Detail workspace (right): semantic blocks

Detail workspace must be split into named blocks (not a single long form):

1) Review header  
2) Customer request  
3) Customer/context metadata  
4) Classification and analysis  
5) Response processing  
6) Pipeline timeline  
7) Internal notes  
8) Actions (contextual)

---

## Part 5 — Review header (status-first)

Required fields:
- request number (primary identifier)
- customer name
- topic/category
- priority
- moderation status
- publication status
- assigned operator
- created / updated timestamps
- contextual quick actions

Quick actions must follow lifecycle semantics (avoid a chaotic button pile):
- assign operator
- change status
- save draft (operator text)
- approve / reject / needs revision
- move to moderation states

---

## Part 6 — Customer request block (“что спросил пользователь” mapping)

AF block “Что спросил пользователь” → Review Flow “Исходное обращение клиента”.

Show customer-visible data (as submitted) first:
- original text
- order/service case ref
- customer-selected topic
- rating
- source channel
- email/contact (if applicable)

Technical/internal metadata must be visually separated (secondary section / collapsible):
- IP
- user agent
- language
- submission timestamp (if duplicated elsewhere)

Invariant:
- **customer-visible vs internal** must never look mixed.

---

## Part 7 — Classification / Analysis block

This ports AF compact metadata cards into Review Flow domain:

- scenario
- sentiment
- priority
- topic
- product area
- classification source
- phrase match + confidence
- matched phrase
- selected template
- AI provider/model (when relevant)

Visual behavior:
- compact key/value rows + pills
- priority and confidence are visible as indicators
- no giant raw JSON by default
- raw/debug behind expandable block

---

## Part 8 — Response processing (must NOT be one flat “system answer” block)

AF “Что ответила система” must be mapped to a 3-layer response pipeline:

### 1) AI Draft

- generated draft text
- generation timestamp
- provider/model
- template used
- policy/constraint hints (compact)
- fallback/confidence (if available)

### 2) Operator Revision

- current operator-edited text
- who edited + timestamp
- moderation status
- (future) diff/changed indicator

### 3) Published/Public Response

- final response as visible to customer
- publication status
- visibility state
- published timestamp
- publication error (if any)

Invariant:
- Operator must always understand:
  - what AI generated
  - what human changed
  - what customer will see

---

## Part 9 — Pipeline timeline (first-class workflow object)

### Required stages (example canonical list)

1. Request received
2. Preprocessing completed
3. Phrase match found / fallback
4. Classification completed
5. Template selected
6. AI draft generated
7. Handed to operator
8. Operator revising
9. In moderation
10. Approved / rejected / needs revision
11. Published / not published / failed

### Visual behavior

- vertical timeline
- current stage highlighted
- completed marked
- failed marked
- timestamps
- short event metadata
- expandable details when needed

---

## Part 10 — Internal notes / operator actions

Target block must support:
- private operator notes
- escalation comments
- internal team comments
- moderation reason
- rejection reason
- needs revision explanation

Invariant:
- internal comments must never appear customer-visible.

---

## Part 11 — Admin console mapping (high-level)

### Analytics

Use:
- dashboard cards
- compact distributions
- trends (later)
- issue summaries

Avoid:
- giant plain tables as the only structure

### Logs

AF logs structure maps almost directly:
- event stream list + filters toolbar
- selected event detail
- structured payload (collapsed by default)
- timeline/trace section

### Prompts

Use:
- version list
- selected prompt detail
- activation status
- controlled creation workflow

### Evaluation

Use:
- case list
- selected case detail
- expected vs actual
- scoring panel
- notes + history

### Knowledge base

Use:
- unified list/detail/editor pattern (shared workspace logic)
Avoid:
- separate isolated CRUD pages per entity with different layouts

---

## Part 12 — Forbidden patterns (for future implementation)

- giant empty whitespace
- centered standalone forms (debug-like)
- isolated CRUD layouts per page without shell primitives
- page-by-page redesign without shell-first foundation
- oversized typography
- generic marketing-SaaS dashboard template look inside company workspace
- copying AF dark palette
- raw JSON as primary UI layer
- mixing customer-visible and internal data
- hiding lifecycle status
- ambiguous single “system answer” block
- losing AI draft vs operator vs published separation
- action buttons without lifecycle semantics
- inconsistent paddings/spacing across pages

---

## Part 13 — UI invariants (must remain true)

- shell-first architecture
- list/detail split for operator workflow
- lifecycle-first semantics
- human-in-the-loop visibility
- AI draft vs operator final separation
- operational density without clutter
- compact metadata hierarchy
- sticky filters/actions where useful
- status and priority always visible
- timeline as first-class object
- customer/internal data separation
- role-aware navigation
- reusable operational primitives
- NL-style visual language

---

## Recommended implementation sequence (post-alignment)

1) **Sprint 020 Phase 1 — Operational Shell Foundation**
   - introduce shared operational primitives (page chrome, split view, cards, badges, timeline)
   - introduce CSS scoping boundary for company contour (reduce coupling with client)
2) Operator workspace evolution (re-express queue/detail using primitives; keep fetch invariants)
3) Observability surfaces (analytics + logs) normalization via shared primitives
4) Knowledge base workspace normalization via shared list/detail/editor pattern
5) Prompts + evaluation workspace evolution (split-view + workflow hierarchy)

