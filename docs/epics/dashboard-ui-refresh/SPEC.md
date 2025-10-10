# Dashboard UI Refresh

## Problem & Context
- The dashboard overview page looks dated, with inconsistent spacing, typography, and color usage that no longer reflects the refreshed brand.
- Primary users (project managers) struggle to scan key metrics quickly because cards and tables lack visual hierarchy.
- Accessibility audits flagged insufficient contrast on primary actions, risking non-compliance.

## Goals
- Apply the new brand palette, typography, and spacing scale to the dashboard overview page.
- Improve card hierarchy and layout so primary metrics are immediately scannable on desktop and mobile.
- Resolve known contrast issues and ensure interactive elements meet AA contrast ratios.

## Non-Goals
- No changes to backend data fetching or dashboard KPIs.
- Do not introduce new widgets or restructure navigation beyond visual styling adjustments.
- Out of scope: refactoring dashboard logic or performance tuning beyond CSS/markup cleanup.

## Primary User Story
As a project manager reviewing the dashboard, I want the overview page to present key metrics with a modern, consistent visual design so I can quickly understand project health without visual clutter.

## Acceptance Criteria
- [ ] Dashboard header uses the new brand typography tokens (`font-heading`, `font-body`) and spacing scale (`space-4` multiples).
- [ ] Primary CTA buttons adopt the updated brand color `#1F6FEB`, meet contrast AA against backgrounds, and have consistent hover/focus styles.
- [ ] Summary metric cards feature clear titles, highlighted values, and supporting context with 16px/24px spacing rules, plus responsive wrapping for ≤768px width.
- [ ] Secondary tables and lists retain existing data but use refreshed row striping and 40px section padding, achieving Lighthouse accessibility ≥90 on desktop/mobile.
- [ ] No layout shifts >0.1 CLS occur during data load; skeleton states align with the new visual styling.

## Constraints & Risks
- Must remain within existing React component structure; only CSS/markup adjustments allowed.
- Ensure responsive behavior from 320px to 1440px; test focus states with keyboard navigation.
- Risk: legacy CSS specificity could override new tokens; plan for incremental testing.

## Out of Scope
- Updating other product areas besides the dashboard overview.
- Modifying API contracts, feature flags, or introducing additional analytics.
