# METICAL V2 — App Building Skill (Agent Instructions)

Ten dokument służy jako wytyczne architektoniczne i instrukcja (skill) dla systemów AI (np. Antigravity) przy pracy nad kolejnymi sprintami aplikacji METICAL V2.

## Zasady pracy na METICAL V2
1. **Modułowość:** Nie mieszaj funkcjonalności różnych modułów. Rozwijaj każdy w dedykowanym folderze.
2. **Kompilacja na każdym etapie:** Po każdej większej zmianie, zanim dokonasz commita, wykonuj komendę `npm run build`. Jeśli build wykazuje błędy TypeScript, należy je poprawić przed przejściem dalej.
3. **Zasada małych sprintów:** Zadania dzielone są na bardzo małe inkrementacje. Nie modyfikuj niepowiązanych plików.
4. **Hotfixy osobno:** Nigdy nie łącz hotfixów (np. naprawy CSS/layoutu, PWA z-index bugs) z wgrywaniem nowych potężnych modułów lub migracją baz.
5. **Krytyczne reguły React:** Pamiętaj o zasadach Hooks. Zawsze używaj hooków (useState, useEffect) przed pierwszym warunkiem powrotu (`if (costam) return null;`).
6. **Polityka migracji SQL:** Najpierw piszesz w pełni poprawną migrację w `supabase/migrations/`. Migracja musi zawierać instrukcje upraszczające tworzenie relacji bez kasowania starych tabel. Następnie **pokazujesz** pełen kod migracji użytkownikowi w odpowiedzi, by sprawdził i manualnie wkleił to w Supabase SQL Editor.
7. **Brak modyfikacji istniejących mechanizmów in-app:** PUSH notifications (OneSignal), powiadomienia Edge Functions i RLS dla standardowych modułów (`tasks`, `investments`) to obszary zamknięte na zmiany bez wyraźnej zgody w osobnym sprincie.

## Aktualna architektura i pliki
Struktura projektu została rozdzielona na "features":
* **Sales:** `src/features/sales/*` – Miejsce logiki, UI i widoków sprzedażowych (Dashboard, Karta Leadu, Follow-Up).
* **Clients:** `src/features/clients/*` – Widoki dedykowane klientom, formularze konwertujące, lista i pobieranie inwestycji z bazy klientów.
* **Typy Supabase:** Pełne schematy mapowane są w `src/types/database.ts`. Zawsze odświeżaj je odpowiednio dodając nullable fields `?` dla kolumn.
* **Services:** Logika dostępu do danych Supabase zmapowana została na pliki konwencji `*Service.ts`, np. `src/features/investments/services/investmentsService.ts` czy `src/features/clients/services/clientService.ts`.

## Istniejące Tabele
1. `profiles`
2. `tasks`, `task_comments`, `task_subscriptions`, `task_archived`
3. `investments`, `investment_members`, `investment_comments`
4. `push_subscriptions`, `notifications`
5. Nowe (z sekcji Sprzedaż): `sales_leads`, `lead_comments`, `lead_activity_log`, `clients`, `client_comments`.

## Zasady działania RLS
* Aplikacja stosuje sztywne role użytkowników: `admin`, `administracja` (dostęp niemal bezwarunkowy do select, update) i `operator` (widzi tylko swoje, czyli `created_by = auth.uid()` lub w których został jawnie przypisany w tabeli asocjacyjnej).
* **Tylko admin** ma prawo uruchamiania klauzuli `DELETE`. Wykorzystuje metodę `public.is_admin()`.

## Wzór Raportu po Sprincie
Zawsze prezentuj zakończenie zadania podając:
- Zmienione pliki.
- Migrację SQL (czy była, jaka).
- Wynik komendy `npm run build`.
- Listę przetestowanych uwarunkowań ręcznie i potwierdzenie działania wg założeń.

## Wzór Checklisty Testowej
Odwołuj się do szablonu zapisanego w `docs/METICAL_V2_REGRESSION_CHECKLIST_AFTER_SALES.md`. Testy muszą pokrywać łączenie Auth, tworzenie zadania, wylistowanie Inwestycji i cały lejek sprzedażowy Lead->Klient.

Przed kontynuacją jakiejkolwiek pracy weryfikuj spójność powyższych logów z rzeczywistością projektu!
