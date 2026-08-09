# CH Pipeline Forensics — After CH Integration

**Date:** 2026-05-30  
**Subject review:** `NL-00999002-001`  
**Selected case:** `delivery_delay_confirmed_order` — «Задержка поставки подтверждённого заказа»  
**Confidence:** HIGH · match 1.00 · source `retrieval_auto`

---

## Executive summary

| Question | Answer |
|----------|--------|
| CH fields wired into generation call? | **Yes** — `response_policy` and `approved_response_text` are assembled into `user_prompt` in `CaseDraftGenerationService.generate()` |
| Case `description` in prompt? | **No** — not included in current CH user prompt |
| Why draft ≠ approved basis in UI? | Active provider is **mock** (`mock-local`). `MockProvider.complete_text()` is a **stub** that ignores both prompts and returns a fixed template string |
| Pipeline integration defect? | **No wiring break** — data reaches the provider interface correctly. Disconnect is **expected mock behaviour**, not a missing CH handoff |
| Backend fix required? | **Not for CH wiring.** Optional improvements: CH-aware mock stub for local dev; use CH-specific system prompt instead of legacy `review_response_generation` registry entry when a real LLM is active |

---

## End-to-end path (NL-00999002-001)

```
POST /api/reviews
  → ReviewPipeline._run_processing (CH_PIPELINE_ENABLED=true)
  → ControlledHybridPipeline.process_review
      → ResponseCaseRetrievalService.retrieve (top_score=1.0, 5 candidates)
      → evaluate_confidence → HIGH (threshold 0.85)
      → create_decision(source=retrieval_auto)
      → CaseDraftGenerationService.generate
          → AIProviderRuntime.resolve → MockProvider (mock-local)
          → complete_text(system_prompt, user_prompt) → stub response
      → ReviewResponse.draft_response persisted
```

**DB evidence**

| Field | Value |
|-------|-------|
| `reviews.id` | `09ef1e78-3f0f-4894-83c6-46afaa5fbcad` |
| `reviews.request_number` | `NL-00999002-001` |
| `reviews.review_text` | Обещали привезти вчера, но заказ так и не приехал |
| `customers.customer_name` | Test CH |
| `review_responses.draft_response` | Здравствуйте, клиент. Благодарим вас за обращение. Мы зафиксировали ваш отзыв и подготовили ответ в рамках выбранного шаблона. |
| `generation_metadata.pipeline` | `controlled_hybrid` |
| `generation_metadata.provider` | `mock` |
| `generation_metadata.model` | `mock-local` |
| `generation_metadata.generation_mode` | `case_policy_adaptation` |
| `generation_metadata.response_case_id` | `4c4dd065-78fc-40f2-9bdd-2cecdd4566e3` |
| `generation_metadata.match_confidence` | `1.0` |
| `generation_metadata.confidence_band` | `high` |

**Operational log sequence:** `review_received` → `case_retrieval_completed` → `case_confidence_evaluated` → `case_decision_recorded` → `draft_generated` (model `mock-local`, latency 0 ms).

---

## B1. Selected response case

| Attribute | Value |
|-----------|-------|
| **ID** | `4c4dd065-78fc-40f2-9bdd-2cecdd4566e3` |
| **case_code** | `delivery_delay_confirmed_order` |
| **title** | Задержка поставки подтверждённого заказа |
| **description** | Клиент сообщает о задержке уже подтверждённой поставки |
| **response_policy** | Извиниться за задержку. Указать текущий статус заказа. Не обещать компенсацию без согласования. Предложить связь со специалистом при необходимости. |
| **approved_response_text** | Здравствуйте! Приносим извинения за задержку доставки вашего заказа. Мы проверили статус отправления и сообщим вам актуальные сроки в ближайшее время. |
| **confidence_threshold** | 0.85 |
| **decision** | `fcd60faa-657f-4fe5-b694-415db2982c57`, source `retrieval_auto`, match_confidence 1.0000 |

Seed source: `backend/migrations/011_ch_data_model_foundation.sql`.

---

## B2. Actual generation payload

Built by `CaseDraftGenerationService.generate()` and passed to `MockProvider.complete_text(system_prompt, user_prompt)`.

### system_prompt (active registry entry `review_response_generation` v1)

```text
You generate a draft customer response using template-guided constrained generation.
Rules:
- Follow the template structure and required elements.
- Do not promise compensation or legal guarantees.
- Do not invent facts.
- Keep a professional tone.
- Output plain text only (no JSON).
```

> **Note:** CH code defines `BOUNDED_SYSTEM_PROMPT` in `draft_generation.py`, but it is **not used** when the registry entry has a non-empty `system_prompt`. The legacy Milestone-4 generation prompt is substituted instead.

### user_prompt (assembled at runtime for NL-00999002-001)

```text
Response policy:
Извиниться за задержку. Указать текущий статус заказа. Не обещать компенсацию без согласования. Предложить связь со специалистом при необходимости.

Approved response basis:
Здравствуйте! Приносим извинения за задержку доставки вашего заказа. Мы проверили статус отправления и сообщим вам актуальные сроки в ближайшее время.

Customer review:
Обещали привезти вчера, но заказ так и не приехал

Customer name: Test CH

Adapt the approved basis into a single customer-facing reply.
```

### Additional CH context blocks

| Block | In prompt? |
|-------|------------|
| `response_policy` | Yes — first section of `user_prompt` |
| `approved_response_text` | Yes — «Approved response basis» section |
| `response_cases.description` | **No** |
| `response_cases.title` | **No** (only in metadata / operator API) |
| Legacy `user_prompt_template` placeholders (`template_text`, `classification_json`, …) | **No** — CH path bypasses template registry user template |
| `generation_metadata` (stored post-call) | See B3 |

### Code that assembles the payload

```45:51:backend/app/services/controlled_hybrid/draft_generation.py
        user_prompt = (
            f"Response policy:\n{response_case.response_policy}\n\n"
            f"Approved response basis:\n{response_case.approved_response_text}\n\n"
            f"Customer review:\n{review.review_text}\n\n"
            f"Customer name: {customer_name}\n\n"
            "Adapt the approved basis into a single customer-facing reply."
        )
```

```42:43:backend/app/services/controlled_hybrid/draft_generation.py
        prompt_version = self.prompts.get_active(PromptService.PROMPT_KEY_GENERATION)
        system_prompt = prompt_version.system_prompt.strip() or BOUNDED_SYSTEM_PROMPT
```

---

## B3. Generation provider

| Attribute | Value |
|-----------|-------|
| **provider** | `mock` |
| **model** | `mock-local` |
| **mode** | `case_policy_adaptation` (metadata) |
| **pipeline** | `controlled_hybrid` |
| **active provider setting** | `mock` — `is_active=true`, `is_enabled=true`, `is_fallback=true` |
| **fallback used** | `false` (mock is the active provider) |
| **OpenAI / GigaChat** | disabled in `ai_provider_settings` |

Resolution path: `ControlledHybridPipeline.process_review` → `AIProviderRuntime.resolve(review_id=…)` → `AIProviderFactory.create` → `MockProvider`.

---

## B4. mock-local: model or stub?

**Answer: test stub / stub implementation — not a generative model.**

`mock-local` is the configured `model_name` for provider key `mock` (`006_milestone7_ai_provider_settings.sql`). The implementation class `MockProvider` implements `complete_text()` by calling `_mock_draft()`, which:

1. Ignores `system_prompt` entirely.
2. Ignores CH content in `user_prompt` (policy, approved basis, review text).
3. Returns a hard-coded Russian template.

```27:30:backend/app/services/ai_providers/mock_provider.py
    def complete_text(self, system_prompt: str, user_prompt: str) -> tuple[str, int]:
        start = time.perf_counter()
        latency_ms = int((time.perf_counter() - start) * 1000)
        return self._mock_draft(user_prompt), latency_ms
```

```59:65:backend/app/services/ai_providers/mock_provider.py
    def _mock_draft(self, user_prompt: str) -> str:
        name_match = re.search(r"customer_name:\s*([^\n]+)", user_prompt, re.I)
        name = name_match.group(1).strip() if name_match else "клиент"
        return (
            f"Здравствуйте, {name}. Благодарим вас за обращение. "
            "Мы зафиксировали ваш отзыв и подготовили ответ в рамках выбранного шаблона."
        )
```

Duplicate logic exists in legacy `LLMClient._mock_draft()` (`backend/app/services/llm_client.py`).

**Secondary stub quirk:** regex expects `customer_name:` (underscore), while CH user prompt emits `Customer name:` (space). Even customer name extraction fails → default «клиент» in output.

---

## B5. Integration checklist

### Q1. Is approved answer passed into the prompt?

**Да.**

Evidence: `response_case.approved_response_text` interpolated into `user_prompt` as «Approved response basis» (see `draft_generation.py` lines 45–51 above).

### Q2. Is response policy passed into the prompt?

**Да.**

Evidence: `response_case.response_policy` is the first block of `user_prompt` (same code block).

### Q3. Is case description passed into the prompt?

**Нет.**

`response_case.description` is never referenced in `CaseDraftGenerationService.generate()` or `ControlledHybridPipeline`. Only policy + approved text + review + customer name are sent.

### Q4. Why is the model output unrelated to approved answer?

Because the **active provider is MockProvider**, not an LLM:

1. CH pipeline correctly builds prompts containing policy and approved basis.
2. `MockProvider.complete_text()` discards both prompts and returns a fixed stub unrelated to case content.
3. Stored `draft_response` matches stub output exactly — confirming no LLM adaptation occurred.
4. With a real provider (OpenAI / GigaChat / ProxyAPI), `complete_text()` would receive the same payload; behaviour would depend on the model, though the **system prompt is still the legacy template-generation prompt**, not `BOUNDED_SYSTEM_PROMPT`.

### Q5. Pipeline break location (if approved answer were not passed)

**Not applicable** — approved answer **is** passed. There is no handoff break between case selection and prompt assembly.

If the question is reframed as «where does approved content stop affecting the final text?»:

| Stage | File | Function | Behaviour |
|-------|------|----------|-----------|
| Prompt assembly | `backend/app/services/controlled_hybrid/draft_generation.py` | `CaseDraftGenerationService.generate` | Includes approved basis ✓ |
| Provider call | `backend/app/services/ai_providers/mock_provider.py` | `MockProvider.complete_text` | **Ignores prompts** — stub output |
| Persistence | `backend/app/services/controlled_hybrid/pipeline.py` | `ControlledHybridPipeline.process_review` | Stores stub as `draft_response` |

---

## Integration state verdict

| Layer | Status |
|-------|--------|
| Retrieval → decision → case binding | OK |
| CH fields → `user_prompt` | OK (policy + approved basis) |
| Case description → prompt | Gap (not wired) |
| CH system prompt | Partial — legacy registry prompt used instead of `BOUNDED_SYSTEM_PROMPT` |
| Provider execution | Mock stub — output decoupled from CH content by design |
| Operator UI display of approved basis | Correct (shows case `approved_response_text`) |
| Operator UI LLM draft | Correctly shows stub output from DB |

**Pipeline fix required?** No — for the observed symptom on `mock-local`, enabling a real LLM provider is sufficient to exercise CH adaptation. Optional hardening: CH-aware mock for local testing; pass `description` into prompt; prefer `BOUNDED_SYSTEM_PROMPT` (or dedicated CH registry key) over legacy generation system prompt.
