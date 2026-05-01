# ANTIGRAVITY SKILL — po stabilizacji METICAL V2

Instrukcja do dalszego kodowania po sprintach UX i hotfixach.

Cel: utrzymać stabilność aplikacji i nie powtarzać błędów z poprzednich etapów.

---

## 1. Zasada główna

Nie zaczynamy nowego modułu, jeśli obecny moduł ma nierozwiązane regresje.

Każde kolejne kodowanie ma być jednym z trzech typów:

1. **Hotfix** — naprawa błędu produkcyjnego.
2. **Sprint UX** — poprawa istniejącego modułu bez zmiany logiki biznesowej.
3. **Nowy moduł** — tylko po osobnej specyfikacji procesu.

Nie mieszać tych typów w jednym promptcie.

---

## 2. Standard hotfixa

Hotfix ma naprawić jeden konkretny problem.

Prompt musi zawierać:

```text
Kontekst:
Co działało i co się zepsuło.

Objaw:
Co widzi użytkownik.

Podejrzany obszar:
Pliki i funkcje do sprawdzenia.

Cel:
Naprawić crash/regresję bez dodawania funkcji.

Nie rób:
Bez nowych modułów, bez migracji, bez refactoru, chyba że absolutnie konieczne.

Akceptacja:
Minimalny test potwierdzający naprawę.
```

Przykład:

```text
Hotfix — White screen po wejściu w szczegóły inwestycji.
Sprawdź InvestmentDetailPage.tsx, ostatni edit mode, hooki, early returns, null guards.
Nie dodawaj funkcji. Napraw runtime crash. Build ma przejść.
```

---

## 3. React Rules of Hooks — obowiązkowa kontrola

Po każdej zmianie komponentu React sprawdź:

- wszystkie `useState`, `useEffect`, `useMemo`, `useCallback` są wywołane przed `return`,
- żaden hook nie jest w `if`, `for`, callbacku lub po `if (loading) return`,
- early returns są dopiero po hookach.

Poprawny schemat:

```tsx
const [a, setA] = useState(null);
const [b, setB] = useState(false);

useEffect(() => {}, []);

if (loading) return <Loading />;
if (!data) return <NotFound />;
```

Błędny schemat:

```tsx
if (loading) return <Loading />;
const [showPanel, setShowPanel] = useState(false);
```

To był realny błąd, który spowodował biały ekran w szczegółach inwestycji.

---

## 4. Standard pracy z InvestmentDetailPage

Ten ekran jest newralgiczny, bo łączy:

- dane inwestycji,
- status,
- komentarze,
- zadania,
- historię,
- powiadomienia,
- unread badge,
- edycję danych.

Przy każdej zmianie sprawdzić:

- loading state,
- not found state,
- null guards,
- auth/user/profile guards,
- status changer,
- komentarze,
- unread mark-as-read,
- edit mode,
- updateInvestment,
- powiadomienia po komentarzu/statusie/edycji.

Nie przebudowywać całego widoku przy małej poprawce.

---

## 5. Standard pracy z powiadomieniami

Każde powiadomienie powinno mieć kontekst:

```text
kto + co zrobił + czego dotyczy
```

Przykłady:

- `Łukasz przypisał(a) Ci zadanie: Zamówić towar`
- `Joanna skomentował(a) inwestycję: Hala Nowak`
- `Admin zmienił(a) status inwestycji: Dom Kowalski → W realizacji`

Nie tworzyć anonimowych powiadomień typu:

- `Nowe zadanie`
- `Podbito zadanie`
- `Nowy komentarz`

---

## 6. Standard unread badge

Unread badge powinien:

- liczyć tylko powiadomienia aktualnego użytkownika,
- liczyć tylko `is_read = false`,
- być powiązany z konkretnym `investment_id` lub `task_id`,
- znikać po wejściu w szczegóły obiektu,
- nie wymagać nowej tabeli, jeśli da się użyć `notifications`.

---

## 7. Standard edycji danych

Edycję danych dodajemy tylko tam, gdzie jest operacyjnie konieczna.

Zasada uprawnień:

- autor/twórca może edytować,
- admin może edytować,
- zwykły użytkownik nie widzi akcji.

Dla inwestycji:

```ts
canEdit = investment.created_by === userId || authProfile?.role === 'admin'
```

Edycja nie powinna zmieniać statusu, jeśli status ma osobny flow.

---

## 8. Standard commitów

Każdy etap ma dostać jasny commit:

```bash
git add .
git commit -m "Hotfix: fix investment detail white screen"
git push
```

Dla sprintu:

```bash
git commit -m "Sprint UX 4.5: add investment notifications and unread badges"
```

Dla dokumentacji:

```bash
git commit -m "Add stabilization report after UX and investment hotfixes"
```

---

## 9. Standard backupu

Po stabilnym punkcie tworzymy branch backup.

Przykład:

```text
backup/stable-mvp-ux5-investment-hotfix-2026-05-01
```

Backup robić po:

- działającym MVP,
- zakończeniu serii sprintów,
- naprawie krytycznego błędu,
- przed dużym nowym modułem.

---

## 10. Checklista po deployu

Po każdym deployu sprawdzić:

1. Logowanie.
2. Lista zadań.
3. Szczegóły zadania.
4. Edycja zadania.
5. Archiwizacja zadania.
6. Archiwum.
7. Podbij.
8. Push.
9. Lista inwestycji.
10. Szczegóły inwestycji.
11. Edycja inwestycji.
12. Zmiana statusu inwestycji.
13. Komentarz w inwestycji.
14. Unread badge.
15. Odświeżenie URL szczegółów zadania i inwestycji.

---

## 11. Czego nie robić bez osobnej specyfikacji

Nie robić spontanicznie:

- modułu Sprzedaż,
- modułu Klienci,
- desktop layoutu,
- uploadu plików,
- zdjęć,
- ofertowania,
- PDF,
- automatyzacji leadów,
- zaawansowanych ról,
- faktur,
- raportów.

Każdy z tych tematów wymaga osobnego dokumentu procesu.

---

## 12. Prompt bazowy do kolejnego hotfixa

```text
Hotfix — [nazwa problemu]

Kontekst:
METICAL V2 działa produkcyjnie. Po ostatniej zmianie pojawił się problem: [opis].

Objaw:
[co dokładnie widzi użytkownik]

Podejrzany obszar:
[pliki/funkcje]

Cel:
Naprawić problem bez dodawania nowych funkcji.

Sprawdź:
- runtime errors,
- null/undefined,
- hooks order,
- brakujące importy,
- useEffect dependencies,
- RLS tylko jeśli dotyczy.

Nie rób:
- nowych modułów,
- migracji, jeśli nie są konieczne,
- refactoru całej aplikacji,
- zmian w push/OneSignal, jeśli nie dotyczy.

Akceptacja:
- npm run build przechodzi,
- problem znika,
- brak regresji w powiązanych funkcjach.

Po zakończeniu pokaż:
- przyczynę,
- zmienione pliki,
- test manualny,
- build status.
```

---

## 13. Prompt bazowy do nowego modułu

Nowy moduł dopiero po specyfikacji.

```text
Kontekst:
METICAL V2 jest stabilne. Dodajemy nowy moduł dopiero po zaakceptowanej specyfikacji procesu.

Cel modułu:
[jedno zdanie]

Proces biznesowy:
[krok po kroku]

Zakres MVP:
[tylko minimum]

Nie robić:
[lista zakazów]

Dane:
[tabele/pola]

Uprawnienia:
[kto widzi, kto edytuje]

Powiadomienia:
[kiedy i do kogo]

Akceptacja:
[test manualny]
```

---

## 14. Reguła końcowa

Jeśli pojawia się błąd produkcyjny, przerywamy wszystkie plany i robimy hotfix.

Stabilność > nowe funkcje.
