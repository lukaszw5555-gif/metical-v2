# SPRINT LAYOUT 1 — Desktop shell + responsive layout

**Data:** 2026-05-01  
**Repozytorium:** REPO_APLIKACJA_METICAL_V2  
**Backup:** backup/stable-sales-1-4-2026-05-01

## Cel

Dodać wygodny desktopowy layout aplikacji bez zmiany logiki biznesowej.  
Na telefonie obecny układ z BottomNav zostaje bez zmian.  
Na desktopie (od breakpointu `md` / 768px) pojawia się boczny Sidebar, a listy wykorzystują pełną szerokość ekranu.

## Czego NIE robimy

- Żadnych nowych funkcji.
- Żadnych migracji SQL.
- Żadnych zmian RLS.
- Żadnych zmian logiki biznesowej (submit, walidacja, zapytania do Supabase).
- Żadnych zmian w Push/OneSignal/Edge Functions/Vercel.
- Żadnego refactoru routingu.

---

## Proposed Changes

### 1. Komponenty Layoutu

#### [NEW] `src/components/layout/Sidebar.tsx`

Nowy komponent — boczny pasek nawigacji widoczny tylko na desktopie (`hidden md:flex`).

Zawartość:
- Logo / nazwa aplikacji u góry.
- Nawigacja dual-mode (identyczna logika jak w BottomNav):
  - **Tryb standardowy:** Zadania, Inwestycje, Klienci, Sprzedaż, Ustawienia.
  - **Tryb sprzedażowy:** Leady, Follow-up, Oferty, Powrót, Ustawienia.
- Wyróżnienie aktywnego linku (np. lewym borderem lub podświetleniem tła).
- Stała szerokość: `w-64` (256px).
- Styl: `fixed left-0 top-0 bottom-0`, ciemne tło lub jasne z borderze prawym.

#### [MODIFY] `src/components/layout/BottomNav.tsx`

Jedyna zmiana: dodanie klasy `md:hidden` do elementu `<nav>`, żeby BottomNav był ukryty na desktopie.  
Zero zmian w logice, elementach nawigacyjnych ani stylach mobilnych.

#### [MODIFY] `src/components/layout/MobileLayout.tsx`

Rozszerzenie o desktop shell:
- Wrapper zmienia się z `flex-col` na `flex-col md:flex-row`.
- Dodanie renderowania `<Sidebar />` wewnątrz layoutu.
- Dodanie `md:ml-64` do kontenera `<main>`, żeby treść nie wjeżdżała pod sidebar.
- Dodanie `md:pb-0` do `<main>`, żeby na desktopie nie było dolnego paddingu pod BottomNav.
- Opcjonalnie: ograniczenie `max-w-7xl mx-auto` wewnątrz main, żeby treść nie rozciągała się na ultraszerokich monitorach.

#### [MODIFY] `src/components/layout/PageHeader.tsx`

- Dodanie `max-w-5xl` (lub `7xl`) i `mx-auto` dla wyrównania z treścią.
- Na desktopie ewentualne zmniejszenie górnego paddingu (na mobile padding pod notch zostaje).

### 2. Strony — rozszerzenie kontenerów i siatki

Na każdej stronie listowej zmiana polega na:
1. Zamiana `max-w-lg` → `max-w-5xl` (lub usunięcie ograniczenia).
2. Dodanie `grid md:grid-cols-2 lg:grid-cols-3 gap-4` do kontenera kart (zamiast `space-y-2`).
3. Na mobile (`< md`) siatka zachowuje jedną kolumnę — zero zmian wizualnych.

#### [MODIFY] `src/features/tasks/TasksPage.tsx`
- Kontener: `max-w-lg` → `max-w-5xl`.
- Lista kart zadań: `space-y-2` → `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`.

#### [MODIFY] `src/features/investments/InvestmentsPage.tsx`
- Kontener: rozszerzenie max-width.
- Lista kart inwestycji: grid na desktopie.

#### [MODIFY] `src/features/sales/pages/LeadsPage.tsx`
- Kontener: rozszerzenie max-width.
- Filtry (status, opiekun, źródło): `flex-wrap` → inline na desktopie.
- Lista kart leadów: grid na desktopie.

#### [MODIFY] `src/features/sales/pages/FollowUpPage.tsx`
- Kontener: rozszerzenie max-width.
- Karty w sekcjach (Zaległe, Dzisiaj, Przyszłe): grid na desktopie.

#### [MODIFY] `src/features/clients/pages/ClientsPage.tsx`
- Kontener: rozszerzenie max-width.
- Lista kart klientów: grid na desktopie.

### 3. Formularze / Modale

Nie zmieniamy pól, walidacji ani submitów.  
Jedyna zmiana: na desktopie modale mogą mieć `max-w-lg` i `mx-auto`, żeby nie rozciągały się na cały ekran.

---

## Pliki — podsumowanie

| Plik | Akcja | Co się zmienia |
|------|-------|---------------|
| `src/components/layout/Sidebar.tsx` | NEW | Boczna nawigacja desktop |
| `src/components/layout/MobileLayout.tsx` | MODIFY | Dodanie Sidebar + flex-row na desktop |
| `src/components/layout/BottomNav.tsx` | MODIFY | Dodanie `md:hidden` |
| `src/components/layout/PageHeader.tsx` | MODIFY | Max-width + wyrównanie |
| `src/features/tasks/TasksPage.tsx` | MODIFY | Szerszy kontener + grid |
| `src/features/investments/InvestmentsPage.tsx` | MODIFY | Szerszy kontener + grid |
| `src/features/sales/pages/LeadsPage.tsx` | MODIFY | Szerszy kontener + grid |
| `src/features/sales/pages/FollowUpPage.tsx` | MODIFY | Szerszy kontener + grid |
| `src/features/clients/pages/ClientsPage.tsx` | MODIFY | Szerszy kontener + grid |

---

## Verification Plan

### Build
```
npm run build
```

### Test Mobile
- BottomNav widoczny i działa.
- Sidebar ukryty.
- Listy w jednej kolumnie.
- Formularze i modale działają jak dotychczas.
- Safe-area padding zachowany.

### Test Desktop (Chrome DevTools, okno > 768px)
- Sidebar widoczny po lewej.
- BottomNav ukryty.
- Tryb standardowy i sprzedażowy przełącza się poprawnie.
- Listy w 2-3 kolumnach.
- Modale wycentrowane.
- Treść nie rozciąga się na ultraszeroki ekran.

---

## Ryzyka

- **Niskie:** Zmiana `max-w-lg` na `max-w-5xl` może wymagać drobnych poprawek w padding/margin na poszczególnych stronach.
- **Niskie:** FAB (Floating Action Button) na stronach zadań — pozycja `fixed right-4 bottom-20` może wymagać korekty na desktopie (np. `md:bottom-8`).
- **Brak:** Logika biznesowa, RLS, baza danych, push — nietknięte.
