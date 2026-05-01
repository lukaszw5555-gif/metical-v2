# SPRINT PV-COMPONENTS 1 — Katalog komponentów PV + CSV Import/Export

**Data:** 2026-05-01
**Repozytorium:** REPO_APLIKACJA_METICAL_V2

## Cel

Dodać moduł katalogu komponentów PV z CRUD, wyszukiwarką, filtrami oraz importem/eksportem CSV.
Routing: `/settings/pv-components` (dane referencyjne w Ustawieniach).

## Czego NIE robimy

- Nie ruszamy migracji 011 (pv_offers)
- Nie zmieniamy formularza oferty PV
- Nie integrujemy komponentów z ofertą (brak pv_offer_items)
- Nie dodajemy PDF, xlsx, push, OneSignal, Edge Functions
- Nie ruszamy Leadów, Klientów, Inwestycji, Zadań

---

## Pliki

| Plik | Akcja |
|------|-------|
| `supabase/migrations/012_pv_components.sql` | NEW |
| `src/features/offers/pv/types/pvComponentTypes.ts` | NEW |
| `src/features/offers/pv/services/pvComponentService.ts` | NEW |
| `src/features/offers/pv/pages/PvComponentsPage.tsx` | NEW |
| `src/features/offers/pv/components/PvComponentFormModal.tsx` | NEW |
| `src/features/offers/pv/services/pvComponentCsv.ts` | NEW |
| `src/App.tsx` | MODIFY (1 nowy route) |
| `src/features/settings/SettingsPage.tsx` | MODIFY (link do katalogu) |

---

## Verification

```
npm run build
```
