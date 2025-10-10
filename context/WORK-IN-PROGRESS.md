# Work In Progress

## Objective
Refresh the dashboard overview UI with new brand typography, color, and spacing tokens while keeping data behavior unchanged.

## Acceptance Criteria
- [x] Header uses updated typography tokens and spacing scale with flag `dashboardUiRefresh` enabled.
- [x] Primary CTA buttons adopt brand color `#1F6FEB` and meet AA contrast including hover/focus states.
- [x] Metric cards display hierarchy with refreshed grid, skeleton alignment, and responsive stacking ≤768px.
- [x] Tables/lists retain existing data but present with new striping, spacing, and maintain accessibility score ≥90.
- [ ] No layout shift >0.1 CLS when loading dashboard data with new skeleton styles.

## Assumptions
- Backend dashboard summary payload shape remains unchanged.
- Design tokens for typography, spacing, and colors already exist in the theme module.
- Feature flag `dashboardUiRefresh` is available for local toggling.

## Tasks
- [x] Update `components/dashboard/Header` typography & spacing tokens gated by `dashboardUiRefresh` (M)
- [x] Refactor `components/dashboard/MetricCard` grid, colors, and skeleton to new brand palette (M)
- [x] Refresh dashboard tables/lists styling with design tokens ensuring AA contrast (S)
- [x] Apply new CTA button variant in dashboard actions with hover/focus specs (S)

## Risks
- Legacy CSS specificity may override new token classes causing inconsistent visuals.
- Skeleton layouts might diverge from final cards, introducing CLS regressions.
- Token imports could be incomplete, leading to runtime styling mismatches.

## Links
- Issue: https://github.com/Nebulatools/mrm/issues/1
- Plan: docs/epics/dashboard-ui-refresh/PLAN.md
