# METICAL V2 — raport projektu i skill do budowy kolejnych aplikacji

Data raportu: 2026-04-30  
Repozytorium: `lukaszw5555-gif/metical-v2`  
Backup branch: `backup/working-mvp-pwa-push-2026-04-30`  
Status: MVP produkcyjne działa jako PWA z powiadomieniami push na iPhone i Android.

---

## 1. Wniosek strategiczny

METICAL V2 zostało zbudowane jako praktyczny, produkcyjny MVP do zarządzania zadaniami i inwestycjami w zespole. Najważniejsza wartość aplikacji nie leży w liczbie funkcji, tylko w sprawdzonym procesie tworzenia: od czystego szkieletu, przez Supabase Auth, RLS, moduły biznesowe, deploy, PWA, aż po realne powiadomienia push.

Największa lekcja: w przyszłych aplikacjach nie wolno od razu budować „pełnego systemu”. Najpierw trzeba zrobić jeden działający rdzeń, wdrożyć go produkcyjnie i dopiero potem dodawać kolejne moduły.

---

## 2. Co zbudowaliśmy

Aplikacja METICAL V2 obejmuje:

- logowanie użytkowników przez Supabase Auth,
- profile użytkowników z rolami,
- widok zadań,
- tworzenie zadań,
- przypisywanie zadań do użytkowników,
- statusy zadań,
- priorytety,
- terminy,
- komentarze do zadań,
- historię aktywności,
- moduł inwestycji,
- tworzenie inwestycji,
- komentarze do inwestycji,
- relację zadanie ↔ inwestycja,
- powiadomienia wewnętrzne,
- badge liczby powiadomień,
- przycisk „Podbij zadanie”,
- PWA na telefon,
- działające powiadomienia push na iPhone,
- działające powiadomienia push na Android,
- deploy na Vercel,
- backend i baza danych w Supabase,
- OneSignal jako dostawca web push,
- Supabase Edge Function jako bezpieczny proxy/backend do wysyłki push.

---

## 3. Finalna architektura

### Frontend

Stack:

- Vite,
- React,
- TypeScript,
- Tailwind,
- React Router,
- mobile-first PWA.

Główne cechy:

- feature-based structure,
- osobne moduły dla zadań, inwestycji, powiadomień, ustawień i auth,
- komponenty UI: Button, Badge, EmptyState, LoadingSpinner,
- dolna nawigacja mobilna,
- sticky header,
- PWA manifest,
- ikony PWA,
- service worker OneSignal.

### Backend / baza

Stack:

- Supabase Auth,
- Supabase Postgres,
- RLS,
- Supabase Edge Functions.

Główne tabele:

- `profiles`,
- `investments`,
- `investment_members`,
- `tasks`,
- `task_comments`,
- `investment_comments`,
- `activity_log`,
- `notifications`,
- `push_subscriptions`.

### Hosting

- GitHub jako repozytorium kodu,
- Vercel jako hosting frontendu,
- Supabase jako backend,
- OneSignal jako dostawca push.

---

## 4. Etapy projektu

### Etap 0 — szkielet aplikacji

Cel: czysta architektura i bazowy layout.

Wykonano:

- Vite + React + TypeScript,
- routing,
- mobile-first layout,
- dolna nawigacja,
- sticky header,
- design system,
- podstawowe komponenty UI,
- placeholdery widoków.

Lekcja: szkielet musi być prosty, czysty i bez logiki biznesowej. Nie wolno zaczynać od funkcji.

---

### Etap 1 — Auth i profile

Cel: bezpieczne logowanie i profil użytkownika.

Wykonano:

- tabela `profiles`,
- role użytkowników,
- Supabase AuthContext,
- ProtectedRoute,
- LoginPage,
- SettingsPage,
- trigger tworzący profil po rejestracji użytkownika.

Błąd/ryzyko: przy Supabase trzeba najpierw poprawnie wykonać migrację SQL, a dopiero później testować frontend.

---

### Etap 2 — core schema

Cel: baza pod zadania, inwestycje, komentarze, historię i powiadomienia.

Wykonano:

- tabele inwestycji,
- tabele zadań,
- komentarze,
- activity log,
- notifications,
- helper functions,
- RLS policies,
- indeksy.

Błąd: pojawiło się ryzyko rekursji RLS przy `investment_members`.

Naprawa: nie wolno używać funkcji sprawdzającej członkostwo w RLS tej samej tabeli, z której ta funkcja czyta.

Zasada na przyszłość:

> Helper RLS nie może zapętlać się na tej samej tabeli. Jeśli funkcja czyta tabelę X, nie używaj jej bezrefleksyjnie w politykach RLS tabeli X.

---

### Etap 3 — realny CRUD zadań

Cel: pierwsza realna funkcja biznesowa.

Wykonano:

- tworzenie zadań,
- lista zadań,
- karta zadania,
- szczegóły zadania,
- zmiana statusu,
- filtrowanie.

Lekcja: zadania były dobrym rdzeniem MVP, bo to jest funkcja codziennego użycia. Nie zaczynaliśmy od rozbudowanego CRM.

---

### Etap 4 — komentarze i historia aktywności

Cel: komunikacja wokół zadania.

Wykonano:

- komentarze do zadań,
- aktualizacja `last_activity_at`,
- historia zmian statusu,
- historia komentarzy.

Lekcja: activity log jest bardzo ważny, bo daje kontrolę nad tym, kto co zrobił. W aplikacjach zespołowych trzeba go planować od początku.

---

### Etap 5 — inwestycje

Cel: dodać kontekst biznesowy dla zadań.

Wykonano:

- lista inwestycji,
- tworzenie inwestycji,
- szczegóły inwestycji,
- statusy inwestycji,
- komentarze,
- historia.

Błąd/decyzja: początkowo operatorzy nie widzieli wszystkich inwestycji.

Naprawa: w tym projekcie zdecydowaliśmy, że cały aktywny zespół ma widzieć wszystkie inwestycje. To uprościło działanie aplikacji.

Zasada na przyszłość:

> Nie projektuj zbyt skomplikowanych uprawnień w MVP. Najpierw prosty, bezpieczny model pracy. Granularne uprawnienia dopiero wtedy, gdy realnie są potrzebne.

---

### Etap 6 — relacja zadanie ↔ inwestycja

Cel: zadania miały być osadzone w kontekście inwestycji.

Wykonano:

- wybór inwestycji przy tworzeniu zadania,
- widoczność inwestycji na karcie zadania,
- widoczność zadań na karcie inwestycji,
- przejścia między zadaniem i inwestycją.

Lekcja: relacje między modułami dodajemy dopiero wtedy, gdy oba moduły osobno działają.

---

### Etap 7 — powiadomienia wewnętrzne i „Podbij”

Cel: zrobić z aplikacji narzędzie do realnej komunikacji.

Wykonano:

- powiadomienia w aplikacji,
- licznik nieprzeczytanych,
- powiadomienie po utworzeniu zadania,
- powiadomienie po komentarzu,
- powiadomienie po zmianie statusu,
- przycisk „Podbij zadanie”,
- `awaiting_response`,
- critical notification.

Lekcja: „Podbij” to prosta funkcja, ale operacyjnie bardzo mocna. W przyszłych aplikacjach warto szukać takich małych funkcji o dużej dźwigni.

---

### Etap 8 — deploy i PWA

Cel: realne użycie na telefonie.

Wykonano:

- Vercel deploy,
- manifest PWA,
- ikony,
- konfiguracja SPA routing,
- instalacja na ekranie głównym.

Lekcja: aplikacja dopiero po deployu pokazuje prawdziwe problemy. Localhost nie jest produkcją.

---

### Etap 9 — subskrypcja push

Cel: użytkownik może zapisać urządzenie do push.

Wykonano:

- OneSignal setup,
- Web Push,
- iPhone PWA,
- Android Chrome,
- `OneSignalSDKWorker.js`,
- `OneSignalSDKUpdaterWorker.js`,
- przycisk „Włącz powiadomienia push”,
- status push w ustawieniach.

Błąd: na Androidzie problemem były ustawienia Chrome / systemowe powiadomienia.

Lekcja:

> Zanim debugujesz kod push, wyślij ręczny push z panelu OneSignal. Jeśli ręczny push nie dochodzi, problem jest w urządzeniu, przeglądarce albo uprawnieniach, nie w aplikacji.

---

### Etap 10 — realna wysyłka push

Cel: backend wysyła powiadomienia do użytkownika.

Początkowo próbowaliśmy targetować po `external_id` OneSignal.

Problem:

- iPhone działał,
- Android miał subskrypcję,
- ręczny push działał,
- ale push z aplikacji przez `external_id` był niestabilny,
- OneSignal potrafił zwracać błędy typu `All included players are not subscribed`, mimo że user/subscription wyglądał jako subscribed.

Finalna decyzja:

> Nie polegać wyłącznie na `external_id`. Przechowujemy własne mapowanie `user_id → onesignal_subscription_id` w Supabase i wysyłamy przez `include_subscription_ids`.

Finalne rozwiązanie:

- tabela `push_subscriptions`,
- zapis `onesignal_subscription_id` po kliknięciu „Włącz push”,
- Edge Function `send-push`,
- JWT do weryfikacji nadawcy,
- `SERVICE_ROLE_KEY` do odczytu subskrypcji odbiorcy,
- wysyłka przez `include_subscription_ids`,
- `is_active`,
- unique active subscription index,
- deaktywacja starych rekordów przy zmianie usera na tym samym urządzeniu.

Kluczowa lekcja:

> Edge Function może weryfikować użytkownika zwykłym JWT, ale operacje serwerowe na danych innych użytkowników powinny być wykonywane server-side przez `SERVICE_ROLE_KEY`, nigdy z frontendu.

---

## 5. Najważniejsze błędy i zasady na przyszłość

### Błąd 1 — zbyt duże zaufanie do `external_id` OneSignal

Objaw:

- subskrypcja widoczna w OneSignal,
- user miał external ID,
- ręczny push działał,
- push z aplikacji nie dochodził.

Wniosek:

> W aplikacjach wewnętrznych lepiej kontrolować mapowanie urządzeń samodzielnie w bazie.

Standard na przyszłość:

- OneSignal może mieć `external_id`, ale nie jest jedynym źródłem prawdy.
- Aplikacja zapisuje `subscription_id` do własnej tabeli.
- Backend wysyła po `include_subscription_ids`.

---

### Błąd 2 — RLS blokujące odczyt danych odbiorcy

Objaw:

- Edge Function działała,
- frontend wywoływał funkcję,
- ale funkcja mogła nie widzieć subskrypcji innego użytkownika.

Wniosek:

> RLS jest dobre dla frontendu, ale Edge Function wykonująca operację systemową musi używać service role po zweryfikowaniu JWT.

Standard na przyszłość:

- frontend: anon key + RLS,
- Edge Function: najpierw verify JWT,
- potem server-side service role do operacji systemowych.

---

### Błąd 3 — duplikat aktywnej subskrypcji

Objaw:

- ten sam `onesignal_subscription_id` był aktywny przy dwóch userach,
- powstało to przez logowanie na różne konta na tym samym urządzeniu.

Finalna naprawa:

- `is_active`,
- deaktywacja starych rekordów,
- partial unique index:

```sql
CREATE UNIQUE INDEX uq_push_sub_active_subscription
  ON public.push_subscriptions(onesignal_subscription_id)
  WHERE is_active = true;
```

Standard na przyszłość:

> Jeden fizyczny browser/device subscription może być aktywny tylko dla jednego użytkownika.

---

### Błąd 4 — debugowanie bez twardych logów

Objaw:

- było dużo zgadywania, czy problem jest w Androidzie, iPhone, OneSignal, Edge Function czy frontendzie.

Naprawa:

- logi w frontendzie,
- logi w Edge Function,
- test ręczny z OneSignal,
- test `debugSubscriptionId`,
- rozdzielenie `caller` i `recipientId`,
- logowanie `recipients/errors` z OneSignal.

Standard na przyszłość:

> Każda integracja zewnętrzna musi mieć tryb diagnostyczny i logowanie: request, target, response, error.

---

### Błąd 5 — przypadkowe dodanie `.env` do repo

Objaw:

- plik `.env` pojawił się w repozytorium.

Zasada:

- `.env` nigdy nie powinien być commitowany,
- `.env.example` może być w repo,
- sekrety trzymamy w Vercel/Supabase,
- jeśli `.env` trafi do repo, usuwamy go z indexu:

```bash
git rm --cached .env
echo .env >> .gitignore
git add .gitignore
git commit -m "Remove env file from repository"
git push
```

---

## 6. Standard budowy kolejnych aplikacji

### Zasada główna

Nie zaczynamy od funkcji. Zaczynamy od architektury, użytkowników, danych i jednego najważniejszego procesu.

### Kolejność etapów

#### Etap 0 — szkielet

- Vite/React/TypeScript,
- routing,
- layout,
- design tokens,
- komponenty UI,
- placeholdery.

Akceptacja:

- `npm run build` bez błędów,
- aplikacja otwiera się lokalnie,
- brak logiki biznesowej.

#### Etap 1 — Auth

- Supabase Auth,
- profiles,
- role,
- ProtectedRoute,
- LoginPage,
- SettingsPage.

Akceptacja:

- użytkownik może się zalogować,
- profil jest pobierany,
- inactive user jest obsłużony,
- role są widoczne.

#### Etap 2 — baza i RLS

- tabele core,
- RLS,
- helper functions,
- indeksy,
- typy TypeScript.

Akceptacja:

- migracja działa,
- RLS nie ma rekursji,
- podstawowe SELECT/INSERT/UPDATE działają.

#### Etap 3 — pierwszy moduł biznesowy

- jeden główny moduł,
- CRUD,
- lista,
- detail,
- statusy.

Akceptacja:

- użytkownik może realnie wykonać podstawowy proces.

#### Etap 4 — komentarze i historia

- komentarze,
- log aktywności,
- `last_activity_at`.

Akceptacja:

- widać kto, co i kiedy zrobił.

#### Etap 5 — drugi kontekst biznesowy

- drugi moduł, np. inwestycje / klienci / projekty,
- minimalny CRUD.

Akceptacja:

- moduł działa samodzielnie.

#### Etap 6 — relacje między modułami

- relacja zadanie ↔ inwestycja,
- przejścia między ekranami,
- widoczność kontekstu.

Akceptacja:

- użytkownik nie gubi kontekstu.

#### Etap 7 — powiadomienia wewnętrzne

- tabela notifications,
- badge,
- mark as read,
- typy powiadomień.

Akceptacja:

- użytkownik widzi powiadomienia w aplikacji.

#### Etap 8 — deploy i PWA

- Vercel,
- manifest,
- ikony,
- SPA rewrite,
- test na telefonie.

Akceptacja:

- aplikacja działa z ikony na telefonie.

#### Etap 9 — subskrypcja push

- OneSignal setup,
- service worker,
- przycisk włączenia push,
- zapis subskrypcji.

Akceptacja:

- ręczny push z OneSignal działa na urządzeniu.

#### Etap 10 — automatyczna wysyłka push

- Supabase Edge Function,
- JWT verify,
- service role server-side,
- `push_subscriptions`,
- wysyłka przez `include_subscription_ids`.

Akceptacja:

- akcja w aplikacji wywołuje push na urządzeniu odbiorcy.

---

## 7. Skill dla Antigravity — zasady pracy

### Rola Antigravity

Antigravity ma wykonywać backend, logikę, Supabase, Edge Functions, routing, typy, serwisy i bezpieczne zmiany architektury.

Nie powinno samodzielnie rozszerzać zakresu.

### Format promptu do Antigravity

Każdy prompt powinien mieć:

```text
Kontekst:
...

Cel:
...

Zakres:
...

Nie rób:
...

Wymagania:
...

Akceptacja:
...

Po zakończeniu pokaż:
- zmienione pliki
- komendy
- test manualny
```

### Zasady

1. Jeden prompt = jeden etap.
2. Nie dodawać modułów pobocznych.
3. Nie robić refactoru przy okazji.
4. Każdy etap kończy się `npm run build`.
5. Każda migracja SQL ma być ręcznie uruchomiona i potwierdzona.
6. Każda Edge Function ma mieć logi diagnostyczne.
7. Każdy deploy ma być sprawdzony w Vercel.
8. Każda integracja zewnętrzna ma test ręczny niezależny od aplikacji.
9. Nie przechowywać sekretów w repo.
10. Przed większą zmianą zrobić branch backup.

---

## 8. Checklisty

### GitHub

- repo utworzone,
- `.env` w `.gitignore`,
- `.env.example` w repo,
- commit po każdym stabilnym etapie,
- backup branch po działającym MVP,
- nie commitować sekretów.

### Supabase

- migracje wykonane w SQL Editor,
- tabele widoczne w Table Editor,
- RLS włączone,
- helper functions sprawdzone,
- brak rekursji RLS,
- service role tylko w Edge Functions,
- sekrety ustawione przez `supabase secrets set`.

### Vercel

- repo połączone,
- build command: `npm run build`,
- output: `dist`,
- env variables ustawione,
- deploy status: Ready,
- SPA routing działa,
- PWA działa z ikony.

### OneSignal

- Web Push skonfigurowany,
- Site URL poprawny,
- service worker w public root,
- App ID w Vercel env,
- REST API Key w Supabase secrets,
- ręczny push działa,
- subskrypcja widoczna w OneSignal,
- Android Chrome ma zgodę systemową,
- iPhone działa jako PWA z ekranu głównego.

### Push production

- użytkownik kliknął „Włącz push”,
- rekord jest w `push_subscriptions`,
- `is_active = true`,
- jeden `onesignal_subscription_id` aktywny tylko raz,
- Edge Function widzi subskrypcje przez service role,
- OneSignal response ma recipients > 0,
- push dochodzi na urządzenie.

---

## 9. Finalny model push notifications

### Subskrypcja

Użytkownik klika „Włącz powiadomienia push”.

Aplikacja:

1. inicjalizuje OneSignal,
2. prosi o zgodę,
3. wykonuje `OneSignal.login(userId)`,
4. pobiera `onesignal_subscription_id`,
5. zapisuje go w `push_subscriptions`,
6. ustawia `is_active = true`,
7. dezaktywuje stare konflikty.

### Wysyłka

Frontend wywołuje:

```text
sendPushNotification({ recipientId, title, body, url, priority })
```

Edge Function:

1. sprawdza JWT nadawcy,
2. pobiera subskrypcje odbiorcy przez service role,
3. wysyła do OneSignal przez `include_subscription_ids`,
4. loguje response,
5. zwraca wynik do frontendu.

### Dlaczego tak

Bo `include_subscription_ids` było empirycznie potwierdzone jako działające na Androidzie i pozwala kontrolować dokładnie, gdzie wysyłamy powiadomienie.

---

## 10. Komendy referencyjne

### Deploy Edge Function

```bash
npx supabase functions deploy send-push
```

### Git commit/push

```bash
git add .
git commit -m "Opis zmiany"
git push
```

### Backup branch

```bash
git checkout -b backup/working-mvp-pwa-push-YYYY-MM-DD
git push origin backup/working-mvp-pwa-push-YYYY-MM-DD
```

### Usunięcie `.env` z repo

```bash
git rm --cached .env
echo .env >> .gitignore
git add .gitignore
git commit -m "Remove env file from repository"
git push
```

---

## 11. Wniosek końcowy

METICAL V2 jest wzorem procesu do następnych aplikacji. Nie chodzi tylko o kod, ale o metodę:

- małe etapy,
- osobne testowanie każdej warstwy,
- produkcyjny deploy wcześnie,
- backupi,
- twarde logi,
- ograniczony zakres,
- najpierw rdzeń, potem dodatki.

Najważniejsza zasada na przyszłość:

> Nie walcz z dziesięcioma problemami naraz. Zawężaj: frontend → backend → baza → integracja → urządzenie. Jeden test ma odpowiadać na jedno pytanie.
