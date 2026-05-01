# METICAL V2 — Sales 1-4 Stabilization Report

**Data checkpointu:** 2026-05-01
**Nazwa repozytorium:** REPO_APLIKACJA_METICAL_V2

## Aktualny stan aplikacji
Aplikacja z powodzeniem łączy dotychczasowe procesy operacyjne z nowo wdrożonym, wieloetapowym lejkiem sprzedażowym. Proces Sales 1-4 został uznany za zamknięty i stabilny. Nie zanotowano zakłóceń w module głównym (Zadania/Inwestycje). Kod kompiluje się bez błędów TypeScript i łamie żadnych reguł React.

## Co działa przed Sales
Przed integracją modułu sprzedaży, stabilnie funkcjonowały i funkcjonują nadal:
- Zadania (lista, szczegóły, archiwizacja, statusy, podbijanie),
- Inwestycje (lista, szczegóły, widoczność zespołowa),
- Komentarze do zadań i inwestycji,
- Powiadomienia wewnętrzne (system in-app dzwoneczka),
- Powiadomienia push (OneSignal) oraz powiązane subskrypcje operatorów.

## Szczegółowe wdrożenia podczas sprintów Sales

### Co dodano w Sales 1
- Tryb Sprzedaż w dolnym menu (BottomNav oddzielające operacje od sprzedaży).
- Dashboard sprzedaży (wykresy i podsumowania).
- Moduł Leadów (tabela `sales_leads`, formularze, widok karty leada, obsługa przypisania handlowców i kwalifikacji).
- System komentarzy dla leadów (`lead_comments`).
- Podstawowe polityki RLS ograniczające dostęp handlowcom.

### Co dodano w Sales 1.1
- Szybka edycja Follow-up z poziomu karty leada (zmiana daty kontaktu i notatki).
- Historia leadu (utworzenie tabeli `lead_activity_log` i panel wyświetlający logi na karcie leadu).

### Co dodano w Sales 2
- Rozbudowany, interaktywny ekran pracy handlowca (Follow-Up Tab) dzielący leady na:
  - Zaległe,
  - Dzisiaj,
  - Przyszłe.
- Umożliwienie szybkiej akcji bezpośrednio z poziomu wierszy follow-upu bez pełnego otwierania karty.

### Co dodano w Sales 3
- Baza Klientów (moduł `Clients` z osobną tabelą `clients`).
- Formularz ręcznego dodawania klienta.
- Karta profilu klienta oraz system komentarzy (`client_comments`).
- Algorytm konwersji: przekształcanie leadu (status WON) na kartę klienta.

### Co dodano w Sales 3.1
- Poprawki UX zapobiegające dziurom informacyjnym:
  - Automatyczny modal wymuszający wpisanie daty i notatki follow-up przy zmianie statusu leadu na "Follow_up".
  - Alert potwierdzenia podczas konwertowania leada na klienta.

### Co dodano w Sales 3.2
- Integracja UI pokazująca jawnie relacje między bazami:
  - Na karcie klienta dodano jawne wskazanie z odnośnikiem, że dany profil to "Klient utworzony z leada".
  - Filtry listowania na `ClientsPage` (Wszyscy, Z leadów, Ręcznie dodani).
  - Wyróżniający, zielony stan na karcie leadu "Ten lead został przekonwertowany na klienta" wraz z wygaszeniem przycisku ponownej konwersji.
- Hotfix dolnego paska mobile (BottomNav nie nachodzi już na przyciski zapisywania formularzy).

### Co dodano w Sales 4
- Możliwość utworzenia gotowej Inwestycji bezpośrednio z profilu klienta.
- Przenoszenie danych adresowo-kontaktowych.
- Wylistowanie powiązanych inwestycji (`investments.client_id`) z odnośnikiem na karcie klienta.

## Architektura Bazodanowa (Supabase)

**Lista nowych tabel:**
1. `sales_leads` — baza przed-sprzedażowa (potencjalni klienci).
2. `lead_comments` — komentarze dla leadów.
3. `lead_activity_log` — logowania działań operacyjnych na leadach.
4. `clients` — baza sprzedażowa po udanej konwersji.
5. `client_comments` — komentarze przypisane do profili klientów.

**Modyfikacje w tabelach:**
- `investments` — dodano `client_id` (uuid, opcjonalny referujący do `clients.id`).

**Lista wykonanych migracji (wymagają synchronizacji Supabase):**
- `007_sales_leads.sql`
- `008_lead_activity_log.sql`
- `009_clients.sql`
- `010_investments_client_link.sql`

## Opis procesu (Lejek): Lead → Follow-up → Klient → Inwestycja
System umożliwia naturalną ścieżkę sprzedażową:
1. Zewnętrzne źródło lub handlowiec tworzy profil **Lead**.
2. Handlowiec zarządza kontaktem przez stronę **Follow-up** (dzwoni, zaktualizowuje notatki i przesuwa terminy kontaktów).
3. Zwycięska oferta kończy się zmianą statusu na Won i uruchamia konwersję w **Klienta**.
4. Wygenerowany w ten sposób profil Klienta gromadzi pełne logi, komentarze i pliki, a handlowiec/operator klika "Utwórz inwestycję", zlecając wykonanie usługi (co otwiera starą logikę modułu **Inwestycji** podpiętą pod ten sam ciąg danych).

## Opis RLS (Ochrona na poziomie wiersza)
Pola RLS dbają o szczelność bazy między poszczególnymi rolami:
* **Admin** oraz **Administracja**: Widzą absolutnie wszystko (wszystkie leady, klientów, komentarze, operacje i wszystkie inwestycje). Dodatkowo z zasady tylko `admin` ma przywilej korzystania z metody `DELETE` w bazie danych.
* **Operator (Handlowiec)**: Ma prawo wglądu i edycji *wyłącznie* w te `sales_leads` i `clients`, które samodzielnie stworzył (`created_by`) LUB do których został jawnie przypisany jako `primary_assigned_to` / `assigned_to` przez kierownictwo. Nie widzi wkładu innych handlowców.

## Czego NIE ruszano (Zabezpieczenie starych modułów)
Zgodnie z protokołem stabilizacyjnym nie ingerowano w żaden sposób w:
* Integrację **Push notifications** oraz usługi zewnętrzne **OneSignal**.
* Wywoływanie i routing logiki chmurowej **Edge Functions**.
* Rdzenne moduły architektoniczne **Zadania** (tworzenie, przypisywanie kalendarz).
* Reguły RLS samego modułu **Inwestycji** (pozostają w systemie powiązania do profilu tworzącego bez zakłóceń dla administratorów).

## Najważniejsze ryzyka
1. Ryzyko niezgodności Supabase TypeScript z logiką, w razie manualnego poprawienia bazy i zapomnienia wygenerowania nowej definicji typów (chociaż interfejs typowy był regularnie dopisywany `src/types/database.ts`).
2. Edge case odnośnie skryptów PWA – zachowanie widoczności `env(safe-area-inset-bottom)` w starych systemach operacyjnych Android przy bottom barze PWA.
3. Potencjalny wyciek nawigacji jeśli modale modalizujące się wzajemnie zostaną przerwane nagłym cofnięciem za pomocą przycisku systemowego Android (wstecz).

## Lista rzeczy odłożonych na później (Plany rozwojowe)
Zgodnie z koncepcją MVPs placeholdery poniższych funkcji zostały wyrenderowane dla zachowania logiki widoku, ale funkcjonalności umieszczono w backlogu:
- Generowanie umów i Ofert jako pliki PDF (`Oferty` tab).
- Moduł wgrywania i podglądu zdjęć/dokumentów (Supabase Storage i sekcja "Dokumenty i zdjęcia").
- Przypomnienia automatyczne (połączenie Next_Follow_up z zewnętrznym API/Pushem w tle).
- Integracja bezpośrednia z Webhookami Facebook Ads do automatycznego parsowania Leadów z landing pages do systemu CRM.
- Szczegółowe raportowanie konwersji czasowych i eksport do CSV.
- Dopracowany Desktop Layout dla CRM z sidebarami zamiast BottomNav.

**Rekomendacja dalszego rozwoju:** Na ten moment struktura jest samowystarczalna i nadaje się do wdrożenia wewnętrznego. Należy przejść na tworzenie backendowych reguł obsługujących dokumentację obiektową w Supabase Storage, aby uruchomić placeholder na karcie klienta.
