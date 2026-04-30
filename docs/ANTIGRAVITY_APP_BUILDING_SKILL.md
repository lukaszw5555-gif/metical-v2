# ANTIGRAVITY APP BUILDING SKILL

Instrukcja do budowania kolejnych aplikacji na podstawie doświadczeń z METICAL V2.

Cel: tworzyć aplikacje szybko, ale bez chaosu, bez przepalania czasu na losowe błędy i bez dodawania funkcji przed stabilizacją rdzenia.

---

## 1. Główna zasada

Nie buduj wszystkiego naraz.

Najpierw powstaje działający rdzeń aplikacji, potem deploy, potem test produkcyjny, dopiero później kolejne funkcje.

Każdy etap musi mieć:

- jeden cel,
- ograniczony zakres,
- jasne kryterium akceptacji,
- `npm run build` bez błędów,
- krótki test manualny.

Jeżeli etap nie działa, nie zaczynamy następnego.

---

## 2. Podział narzędzi

### Antigravity

Antigravity używamy do:

- backendu,
- Supabase,
- migracji SQL,
- RLS,
- Edge Functions,
- auth,
- routingu,
- typów TypeScript,
- serwisów danych,
- logiki biznesowej,
- integracji zewnętrznych,
- napraw błędów architektonicznych.

### Lovable / UI tools

Lovable lub inne narzędzia UI używamy do:

- layoutu,
- formularzy,
- tabel,
- dashboardów,
- widoków mobilnych,
- dopracowania UX,
- estetyki.

Nie mieszamy tych ról bez potrzeby.

---

## 3. Standardowy format promptu do Antigravity

Każdy prompt powinien mieć taki format:

```text
Kontekst:
Krótko opisz, co już istnieje i na jakim etapie jesteśmy.

Cel:
Jedno zdanie: co dokładnie ma zostać zrobione.

Zakres:
Lista konkretnych plików, modułów lub zachowań do zmiany.

Nie rób:
Czego Antigravity nie może ruszać.

Wymagania:
Warunki techniczne, bezpieczeństwo, RLS, build, logi.

Akceptacja:
Po czym poznamy, że etap jest skończony.

Po zakończeniu pokaż:
- zmienione pliki,
- komendy do uruchomienia,
- test manualny,
- ewentualne migracje SQL.
```

---

## 4. Kolejność budowy aplikacji

### Etap 0 — szkielet

Cel: uruchomić pustą aplikację z dobrą strukturą.

Zakres:

- Vite + React + TypeScript,
- routing,
- layout,
- podstawowe komponenty UI,
- struktura folderów,
- `.env.example`,
- `.gitignore`.

Akceptacja:

- aplikacja uruchamia się lokalnie,
- `npm run build` przechodzi,
- brak logiki biznesowej.

---

### Etap 1 — Auth i profile

Cel: użytkownik może się zalogować i ma profil.

Zakres:

- Supabase Auth,
- tabela `profiles`,
- role,
- ProtectedRoute,
- AuthContext,
- LoginPage,
- SettingsPage.

Akceptacja:

- login działa,
- profil jest pobierany,
- użytkownik bez sesji nie widzi aplikacji,
- role są dostępne w aplikacji.

---

### Etap 2 — baza danych i RLS

Cel: przygotować bezpieczną strukturę danych.

Zakres:

- migracje SQL,
- tabele core,
- RLS,
- helper functions,
- indeksy,
- typy TypeScript.

Zasady:

- RLS zawsze włączone,
- helper functions nie mogą powodować rekursji,
- nie używać funkcji czytającej tabelę X w polityce RLS tej samej tabeli X bez analizy,
- admin helpers jako `SECURITY DEFINER`,
- każda tabela ma jasną politykę SELECT/INSERT/UPDATE/DELETE.

Akceptacja:

- migracja działa w SQL Editor,
- tabele są widoczne,
- build przechodzi,
- podstawowe zapytania działają.

---

### Etap 3 — pierwszy moduł biznesowy

Cel: zbudować jeden główny proces aplikacji.

Przykład: zadania, leady, projekty, oferty.

Zakres:

- CRUD,
- lista,
- detail,
- formularz,
- statusy,
- podstawowe filtry.

Akceptacja:

- użytkownik może realnie wykonać proces od początku do końca.

---

### Etap 4 — komentarze i historia

Cel: aplikacja ma pamiętać działania użytkowników.

Zakres:

- komentarze,
- activity log,
- `created_by`,
- `updated_at`,
- `last_activity_at`,
- historia zmian statusu.

Akceptacja:

- widać kto, co i kiedy zrobił.

---

### Etap 5 — drugi moduł biznesowy

Cel: dodać kontekst do pierwszego modułu.

Przykład: zadania + inwestycje, leady + klienci, projekty + etapy.

Zasada:

Drugi moduł dodajemy dopiero, gdy pierwszy działa.

---

### Etap 6 — relacje między modułami

Cel: moduły mają się łączyć.

Zakres:

- foreign keys,
- widoczność powiązań,
- przejścia między widokami,
- liczniki powiązanych elementów.

Akceptacja:

- użytkownik nie traci kontekstu.

---

### Etap 7 — powiadomienia wewnętrzne

Cel: aplikacja informuje użytkowników o zmianach.

Zakres:

- tabela `notifications`,
- licznik nieprzeczytanych,
- mark as read,
- typy powiadomień,
- linkowanie do zadania/projektu/inwestycji.

Akceptacja:

- użytkownik widzi nowe zdarzenia w aplikacji.

---

### Etap 8 — deploy i PWA

Cel: aplikacja działa produkcyjnie na telefonie.

Zakres:

- Vercel,
- SPA rewrite,
- manifest,
- ikony,
- mobile layout,
- instalacja na ekranie głównym.

Akceptacja:

- aplikacja działa z publicznego URL,
- można dodać ją do ekranu głównego,
- login działa na telefonie.

---

### Etap 9 — subskrypcja push

Cel: użytkownik może zapisać urządzenie do powiadomień push.

Zakres:

- OneSignal setup,
- service worker,
- przycisk „Włącz push”,
- status zgody,
- zapis subskrypcji do bazy.

Zasada:

Najpierw musi działać ręczny push z panelu OneSignal. Dopiero potem debugujemy automatyczną wysyłkę z aplikacji.

---

### Etap 10 — automatyczna wysyłka push

Cel: akcja w aplikacji wysyła push do odbiorcy.

Finalny standard:

- frontend wywołuje Edge Function,
- Edge Function weryfikuje JWT nadawcy,
- Edge Function używa `SERVICE_ROLE_KEY` tylko server-side,
- subskrypcje odbiorcy są pobierane z tabeli `push_subscriptions`,
- wysyłka przez OneSignal `include_subscription_ids`,
- logi pokazują request, recipientId, subscription ids, response, recipients, errors.

Nie polegać wyłącznie na `external_id` OneSignal jako źródle prawdy.

---

## 5. Standard push notifications

### Tabela

Tworzymy tabelę:

```sql
public.push_subscriptions:
- id uuid primary key
- user_id uuid references profiles(id)
- onesignal_subscription_id text not null
- onesignal_user_id text
- platform text
- device_label text
- is_active boolean default true
- created_at timestamptz
- updated_at timestamptz
```

Wymagany indeks:

```sql
CREATE UNIQUE INDEX uq_push_sub_active_subscription
  ON public.push_subscriptions(onesignal_subscription_id)
  WHERE is_active = true;
```

### Zasada mapowania

Jeden `onesignal_subscription_id` może być aktywny tylko dla jednego usera.

Jeśli użytkownik loguje się na innym koncie na tym samym urządzeniu:

1. dezaktywujemy stary rekord,
2. aktywujemy nowy rekord dla aktualnego usera.

### Edge Function

Edge Function:

1. sprawdza `Authorization` header,
2. weryfikuje użytkownika przez Supabase Auth,
3. używa service role do odczytu subskrypcji odbiorcy,
4. wysyła push przez OneSignal,
5. loguje wynik.

Nigdy nie wystawiamy service role key do frontendu.

---

## 6. Checklist przed zakończeniem etapu

Przed uznaniem etapu za zakończony:

- `npm run build` przechodzi,
- migracje SQL są uruchomione,
- Vercel ma status Ready,
- funkcje Supabase są wdrożone,
- test manualny przeszedł,
- nie ma sekretów w repo,
- `.env` nie jest commitowany,
- logi nie pokazują krytycznych błędów,
- zrobiony commit,
- przy ważnym punkcie zrobiony backup branch.

---

## 7. Debugowanie — kolejność

Nie zgadywać. Zawężać.

Kolejność diagnozy:

1. Czy frontend wywołuje funkcję?
2. Czy Edge Function ma log?
3. Czy JWT jest poprawny?
4. Czy baza zwraca dane?
5. Czy RLS nie blokuje operacji?
6. Czy service role jest używane tylko server-side?
7. Czy payload do API zewnętrznego jest poprawny?
8. Czy API zewnętrzne zwraca recipients/errors?
9. Czy urządzenie fizycznie odbiera ręczny test?
10. Czy problem dotyczy kodu, integracji czy urządzenia?

---

## 8. Zasady bezpieczeństwa

- `.env` nigdy nie trafia do repo.
- `.env.example` może być w repo.
- Vercel env trzyma publiczne frontendowe zmienne.
- Supabase secrets trzyma backendowe sekrety.
- `SERVICE_ROLE_KEY` tylko w Edge Functions.
- OneSignal REST API Key tylko w Supabase secrets.
- RLS nie jest wyłączane dla wygody.
- Jeśli potrzebny jest dostęp systemowy, robi to Edge Function po weryfikacji JWT.

---

## 9. Gotowy prompt startowy do nowej aplikacji

```text
Kontekst:
Budujemy nową aplikację web/PWA w stylu METICAL V2. Stack: Vite + React + TypeScript + Supabase + Vercel. Pracujemy etapami. Nie wolno dodawać funkcji poza zakresem etapu.

Cel etapu:
[tu wpisz jeden konkretny cel]

Zakres:
[lista plików/modułów]

Nie rób:
- nie dodawaj nowych modułów,
- nie zmieniaj architektury poza zakresem,
- nie ruszaj RLS bez potrzeby,
- nie dodawaj funkcji pobocznych,
- nie refactoruj przy okazji.

Wymagania:
- TypeScript bez błędów,
- npm run build ma przejść,
- kod ma być prosty,
- logika ma być czytelna,
- jeśli jest Supabase, uwzględnij RLS,
- jeśli jest Edge Function, dodaj logi diagnostyczne.

Akceptacja:
[po czym poznamy, że działa]

Po zakończeniu pokaż:
- zmienione pliki,
- komendy do uruchomienia,
- migracje SQL, jeśli są,
- test manualny,
- potencjalne ryzyka.
```

---

## 10. Reguła końcowa

Największym ryzykiem nie jest brak funkcji. Największym ryzykiem jest chaos.

Dlatego:

- jeden etap naraz,
- jeden problem naraz,
- jeden test naraz,
- backup po stabilnym punkcie,
- dopiero potem następny krok.
