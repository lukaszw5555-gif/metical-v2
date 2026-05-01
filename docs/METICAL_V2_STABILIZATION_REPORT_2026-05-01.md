# METICAL V2 — raport stabilizacji po sprintach UX i hotfixach

Data: 2026-05-01  
Repozytorium: `lukaszw5555-gif/metical-v2`  
Backup branch: `backup/stable-mvp-ux5-investment-hotfix-2026-05-01`  
Checkpoint commit: `2772183095e36866b6c0e6af1addcfa7cd32ccd7` — `Hotfix: fix investment detail white screen`

---

## 1. Wniosek

METICAL V2 jest obecnie stabilnym MVP operacyjnym po serii poprawek UX i hotfixów. Aplikacja działa jako PWA, ma działające zadania, inwestycje, archiwum, komentarze, powiadomienia, push na iPhone/Android oraz poprawioną warstwę wizualną.

Najważniejsza decyzja: przed dodawaniem modułów Sprzedaż/Klienci aplikacja powinna być używana realnie przez 1–2 dni, aby zebrać tylko błędy operacyjne, a nie otwierać nowe funkcje.

---

## 2. Aktualny stan aplikacji

Działa:

- logowanie i role,
- moduł Zadania,
- moduł Inwestycje,
- komentarze w zadaniach,
- komentarze w inwestycjach,
- powiadomienia wewnętrzne,
- push notifications na iPhone i Android,
- PWA,
- archiwizacja zadań,
- archiwum zadań,
- edycja zadania przez autora,
- edycja inwestycji przez twórcę/admina,
- unread badge dla inwestycji,
- grupowanie podbić w powiadomieniach,
- spójniejszy visual system.

---

## 3. Zrealizowane sprinty i poprawki

### Sprint UX 1 — Zadania, filtry, karty i podbite

Zrobiono:

- główne kategorie: `Moje`, `Zlecone`, `Podbite`,
- liczniki przy kategoriach,
- filtry dla `Moje`: aktywne, własne, przypisane, podbite, wykonane,
- filtry dla `Zlecone`: aktywne, nierozpoczęte, w trakcie, wykonane,
- uproszczenie statusów frontendowo do: `Nie rozpoczęto`, `W trakcie`, `Zrobione`,
- opis zadania widoczny na karcie,
- zlecający widoczny na karcie,
- podbite zadanie wyróżnione amber akcentem,
- podbite zadanie trafia wyżej na liście.

Regresja po sprincie:

- statusy w szczegółach pokazywały duplikat `Nie rozpoczęto`,
- filtr `Moje / Własne` pokazywał zrealizowane.

Naprawa:

- w status control pokazujemy tylko 3 opcje,
- `czeka` mapowane wizualnie jako `Nie rozpoczęto`,
- wykonane zadania widoczne tylko w filtrze `Wykonane`.

---

### Sprint UX 2 — Edycja, archiwizacja i szczegóły zadania

Zrobiono:

- edycja tytułu i opisu zadania tylko przez autora,
- archiwizacja zadania tylko przez autora,
- soft delete przez `archived_at` / `archived_by`,
- archiwum zadań w Ustawieniach,
- zadania archiwalne znikają z aktywnych list,
- komentarze w szczegółach zadania są bardziej dostępne,
- status zadania jest mniej dominujący,
- większy padding listy, aby FAB nie nachodził na karty,
- poprawka tekstu `od X` na czytelniejsze `Zlecający: X`.

---

### Sprint UX 3 — Visual system

Zrobiono:

- mocniejszy kontrast tekstów,
- ciemniejsze tytuły,
- wyraźniejsze karty,
- tokeny kolorów w `index.css`,
- spójniejsze chipy statusów i priorytetów,
- bardziej jednoznaczne aktywne taby,
- mocniejsze liczniki,
- spójniejszy wygląd przycisków, inputów i kart.

Cel: aplikacja ma być mniej blada, bardziej czytelna i stabilna wizualnie.

---

### Sprint UX 4 — Powiadomienia zadań

Zrobiono:

- powiadomienia pokazują kontekst: kto + co + jakie zadanie,
- push dla nowych zadań, komentarzy, statusów i podbić zawiera więcej informacji,
- NotificationsPage dostał chipy typów zdarzeń,
- wiele podbić tego samego zadania przez tego samego autora jest grupowane w jedno powiadomienie z licznikiem `×N`,
- kliknięcie grupy oznacza całą grupę jako przeczytaną.

---

### Sprint UX 4.5 — Powiadomienia inwestycji i unread badge

Zrobiono:

- powiadomienie po utworzeniu inwestycji,
- powiadomienie po komentarzu w inwestycji,
- powiadomienie po zmianie statusu inwestycji,
- unread badge na karcie inwestycji,
- `getUnreadCountsByInvestment()`,
- `markInvestmentNotificationsAsRead()`,
- wejście w szczegóły inwestycji czyści licznik nieprzeczytanych dla aktualnego użytkownika.

Zasada:

- powiadomienia inwestycyjne trafiają do innych aktywnych użytkowników, nie do autora zdarzenia.

---

### Sprint UX 5 — Szczegóły inwestycji

Zrobiono:

- status inwestycji przeniesiony do karty głównej,
- status changer jest zwijany,
- usunięta osobna dominująca karta statusu,
- zadania i komentarze nie są rozdzielane przez status,
- zachowana logika powiadomień inwestycji i unread badge.

Nowa hierarchia:

1. karta główna + zwijany status,
2. komponenty / zakres,
3. zadania,
4. komentarze,
5. historia.

---

## 4. Hotfix — edycja inwestycji

Problem:

- zaliczkę można było zaznaczyć tylko podczas tworzenia inwestycji,
- po utworzeniu nie dało się poprawić danych klienta ani inwestycji.

Zrobiono:

- przycisk `Edytuj dane` w szczegółach inwestycji,
- edycja tylko dla twórcy inwestycji lub admina,
- możliwość edycji:
  - nazwy inwestycji,
  - klienta,
  - telefonu,
  - maila,
  - adresu,
  - typu,
  - zaliczki,
  - notatki/komponentów,
- inline formularz,
- `Zapisz` / `Anuluj`,
- activity log i powiadomienie po edycji.

---

## 5. Hotfix — white screen w szczegółach inwestycji

Problem:

Po hotfixie edycji inwestycji lista inwestycji działała, ale wejście w szczegóły pokazywało biały ekran.

Przyczyna:

- naruszenie React Rules of Hooks,
- `useState(false)` dla `showStatusPanel` był wywołany po early returns (`if (loading) return`, `if (!inv) return null`),
- React hooki muszą być wywoływane zawsze w tej samej kolejności.

Naprawa:

- przeniesiono `useState(showStatusPanel)` nad early returns,
- build przeszedł,
- szczegóły inwestycji działają,
- odświeżenie URL szczegółów działa,
- edycja inwestycji nadal działa.

Lekcja:

> Po każdym refactorze komponentu React sprawdzamy, czy żaden hook nie jest poniżej conditional return.

---

## 6. Najważniejsze lekcje techniczne

### 6.1 Hooki React

Nie wolno wywoływać hooków warunkowo ani po early returns.

Poprawny schemat:

```tsx
const [stateA, setStateA] = useState(...);
const [stateB, setStateB] = useState(...);

if (loading) return <Loading />;
if (!data) return <NotFound />;
```

Błędny schemat:

```tsx
if (loading) return <Loading />;
const [state, setState] = useState(false);
```

---

### 6.2 Nie robić dużych sprintów naraz

Największą skuteczność dały małe, zamknięte sprinty:

- UX 1 — tylko zadania,
- UX 2 — tylko edycja/archiwum,
- UX 3 — tylko visual,
- UX 4 — tylko powiadomienia zadań,
- UX 4.5 — tylko powiadomienia inwestycji,
- UX 5 — tylko szczegóły inwestycji.

---

### 6.3 Hotfix to nie sprint

Hotfix ma:

- jeden problem,
- jeden cel,
- minimalny zakres,
- brak nowych funkcji,
- szybki test manualny,
- szybki commit.

---

### 6.4 Powiadomienia muszą mieć kontekst

Dobre powiadomienie odpowiada od razu na:

- kto,
- co zrobił,
- czego dotyczy.

Przykład:

`Łukasz podbił(a) zadanie: Zamówić towar`

---

### 6.5 Liczniki są ważniejsze niż kolejny moduł

Unread badge przy inwestycji znacząco zwiększa użyteczność, bo użytkownik od razu widzi, gdzie coś się zmieniło.

---

## 7. Zasada dalszego rozwoju

Na ten moment nie dodawać nowych modułów.

Najbliższe 1–2 dni:

- używać aplikacji w pracy,
- zbierać tylko błędy i tarcia,
- nie tworzyć nowych funkcji,
- nie ruszać Sprzedaży/Klientów,
- nie robić desktopu.

Dopiero po stabilizacji:

1. specyfikacja modułu Sprzedaż,
2. specyfikacja modułu Klienci,
3. desktop/responsive layout,
4. ewentualnie upload dokumentów.

---

## 8. Checklista stabilności po każdym kolejnym wdrożeniu

Po każdym deployu sprawdzić:

- logowanie,
- lista zadań,
- szczegóły zadania,
- komentarz w zadaniu,
- podbicie zadania,
- push,
- lista inwestycji,
- szczegóły inwestycji,
- komentarz w inwestycji,
- zmiana statusu inwestycji,
- edycja inwestycji,
- unread badge,
- archiwum zadań,
- odświeżenie URL szczegółów zadania i inwestycji.

---

## 9. Decyzja końcowa

Aplikacja jest po etapie stabilizacji UX i hotfixów. Obecnie priorytetem jest używanie i obserwacja, nie rozbudowa.

Następne kodowanie powinno być oparte na pełnej specyfikacji, a nie spontanicznym dodawaniu funkcji.
