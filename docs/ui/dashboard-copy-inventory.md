# Dashboard Copy Inventory (Core + Copy Tranche)

## Scope
- Shared dashboard shell: `src/components/dashboard/DashboardSidebar.tsx`, `src/components/dashboard/DashboardHeader.tsx`
- Farmer dashboard/module pages (titles + form/dialog labels)
- Role dashboard landing pages: agent, logistics, marketplace, admin

## Canonical i18n Rules
- Role dashboard domain copy uses role-scoped keys when code already does (`farmer.crops.*`, `farmer.farmlands.*`, `farmer.transport.*`)
- Shared UI chrome uses shared namespaces (`nav.*`, `dashboardShell.*`, `common.*`)
- New keys use camelCase leaf names
- Legacy snake_case and flat farmer-module keys are supported through `src/i18n/aliases.ts`

## Shell Copy Conventions
- Nav labels: concise nouns (`Dashboard`, `Orders`, `Service Area`)
- Dashboard shell titles: role product naming (`AgriNext Gen Market`, `AgriNext Gen Transport`)
- Dashboard shell subtitles: role context (`Marketplace Buyer`, `Field Operations`)
- CTA labels: verb-first (`Create Buyer Profile`, `Suggest Best Route`)

## Key Mappings (Examples)
- `settings.profile_settings` -> `settings.profileSettings` (alias)
- `auth.sign_out` -> `auth.signOut` (alias)
- `farmer.crops.title` -> `crops.title` (prefix bridge, while canonical farmer keys are completed)
- `farmer.farmlands.villagePlaceholder` -> `farmlands.yourVillage` (direct alias)
- `enum.units.quintals` -> `common.quintals` (direct alias)

## Notes
- This tranche prioritizes English console cleanliness and visible label correctness.
- Kannada parity remains structurally safe (matching key shape), with translation quality refinement in the follow-up tranche.
