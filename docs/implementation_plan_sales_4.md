# Sprint Sales 4 — Utworzenie inwestycji z klienta

Celem jest zintegrowanie istniejącego modułu Inwestycji z nowym modułem Klientów poprzez umożliwienie utworzenia Inwestycji bezpośrednio z karty klienta i wyświetlenie listy powiązanych inwestycji.

## Proposed Changes

### 1. Database Migration

**[NEW] `supabase/migrations/010_investments_client_link.sql`**
- Dodanie kolumny `client_id uuid REFERENCES public.clients(id)` do tabeli `public.investments`.
- Dodanie indeksu `idx_investments_client_id`.
- Pozostawienie istniejącego RLS dla inwestycji bez zmian (istniejące polityki wystarczą).

---

### 2. Frontend: Types & Services

**[MODIFY] `src/types/database.ts`**
- Dodanie opcjonalnego pola `client_id?: string | null` do interfejsu `Investment`.

**[MODIFY] `src/features/investments/services/investmentsService.ts`**
- Dodanie `client_id` do `CreateInvestmentInput` oraz uzupełnienie zapytania `insert`.
- Dodanie nowej funkcji `getInvestmentsByClientId(clientId: string)` by ładować tylko inwestycje powiązane z danym klientem.

---

### 3. Frontend: UI & Components

**[MODIFY] `src/features/investments/components/InvestmentFormModal.tsx`**
- Rozszerzenie modala tak, aby mógł przyjmować opcjonalny prop `initialData` typu `Partial<InvestmentFormData>`.
- Inicjalizacja stanu formularza (np. imię, telefon, e-mail, adres) na podstawie `initialData`.
- Pola uzupełnione z initialData będą mogły być normalnie edytowane.

**[MODIFY] `src/features/clients/pages/ClientDetailPage.tsx`**
- Zastąpienie placeholdera "Inwestycje klienta - w przygotowaniu" właściwą sekcją z listą.
- Dodanie stanu dla `investments: Investment[]` oraz funkcji ładującej te inwestycje za pomocą nowo stworzonej metody z serwisu.
- Wylistowanie powiązanych inwestycji z możliwością przejścia do szczegółów inwestycji.
- Dodanie przycisku "Utwórz inwestycję", który otwiera wyżej zmodyfikowany `InvestmentFormModal`.
- Do modala przekażemy prop `initialData` uzupełniony danymi klienta oraz obsłużymy `onSubmit`, dodając do payloadu właściwe `client_id` przed zapisaniem w bazie.

## Verification Plan
1. Uruchomienie `npm run build` by sprawdzić, czy nie dodano nowych błędów typowania.
2. Wejście na kartę klienta –> weryfikacja wyświetlania "Brak inwestycji".
3. Uruchomienie formularza nowej inwestycji z poziomu klienta i sprawdzenie, czy odpowiednie pola są uzupełnione.
4. Zapisanie inwestycji, która powinna zyskać `client_id` i wyświetlać się w nałożonej na klienta zakładce.
5. Upewnienie się, że inwestycja jest dostępna i działa prawidłowo również ze standardowej zakładki "Inwestycje".
