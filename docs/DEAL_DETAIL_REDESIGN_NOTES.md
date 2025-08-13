# VC Deal Detail Redesign — Implementation Notes (2025-08)

This document aggregates the redesign requirements, decisions taken, and integration details for the Deal Detail page.

## Summary

- Adopted the Figma "VC Deal Detail View Redesign" direction:
  - Clean top area with no right-aligned actions (Download Deck, Refresh Data, Delete removed).
  - Two assessment panels side-by-side: "AI Assessment" and "Analyst (Final) Assessment", each with Investment Rationale (left) and Pros/Cons (right).
  - Analyst panel includes a recommendation control mapped to `quality_percentile` (Not/Potentially/Interesting/Very/Most → Top 50/20/10/5/1%).

## Frontend

- File: `brain/assets/src/pages/deal_detail.tsx`
- Components:
  - AI Assessment block (read-only) renders fields from the most recent `DealAssessment` (`auto_*` fields).
  - Analyst (Final) block allows inline editing; subtle Edit button (shadcn/ui `Button` with `ghost` variant), Save/Cancel actions.
  - Rationale/Pros/Cons use native textareas and Tailwind for simplicity; quality percentile uses a native `<select>`.
- Data Loading:
  - `GET /api/deals/assessments/?deal=<uuid>&ordering=-created_at&page_size=1` to fetch the latest.
  - On save: `POST` or `PATCH` to `/api/deals/assessments/` with `{ deal, investment_rationale, pros, cons, quality_percentile }`.
- Other UI changes:
  - Removed previous refresh/status controls per updated spec.
  - Kept Summary, Industries, Signals, Decks, Papers, and Related Documents panels intact.

## Backend

- Serializer changes: `brain/apps/deals/api/serializers.py`
  - `DealAssessmentReadSerializer` now exposes `auto_*` fields and timestamps for the AI panel.
  - `DealAssessmentSerializer` includes `recommendation` (available for future flows) and retains `quality_percentile` (used as the recommendation selector in the new UI).

## Data Seeding (from Figma app)

- Command: `python manage.py import_figma_deal <path>`
- Place example JSON in `brain/seed_data/figma_vc_deal_example.json` (gitignored)
- Behavior:
  - Creates or updates `Company`, `Deal`, many-to-many `Industry` links by name, optional `FundingStage` by name.
  - Creates a `DealAssessment` record copying both AI (as `auto_*`) and Analyst fields.
  - Use `--update` when the JSON includes an existing `deal.uuid` and you intend to update it.

## Open Items / Assumptions

- The exact Figma app export schema may differ; adjust the importer mapping as needed.
- The textual “recommendation” in the prompt maps to `quality_percentile` in our domain model; if a distinct recommendation scale is required, extend the model/serializer and UI accordingly.
- If we need a status-only indicator (e.g., ingestion state) without actions, we can add a small caption under the title without breaking the clean header.

## How to Verify Locally

1. Start backend + vite dev server (see repository guidelines).
2. Seed example data:
   - `python manage.py import_figma_deal brain/seed_data/figma_vc_deal_example.json`
3. Visit `/deals/<deal_uuid>/`:
   - Confirm assessments row is present and editable for the Analyst panel.
4. Optionally update the JSON to reflect real Figma app data and re-run with `--update`.
