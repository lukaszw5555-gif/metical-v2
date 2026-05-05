# MET-FUNNEL-004 — Endpoint `ingest-lead` — Dokumentacja Zapier

## Endpoint

```
POST https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/ingest-lead
```

## Wymagany header

```
x-ingest-secret: <wartość LEAD_INGEST_SECRET>
Content-Type: application/json
```

## Format Body (JSON)

```json
{
  "source_type": "website_domy | website_hale | website_instalacje | meta_domy | meta_hale | manual | excel_import | other",
  "investment_type": "dom | hala | instalacja | pv | inne",
  "source_form_name": "METICAL_Briefy/Domy",
  "source_campaign": null,
  "source_external_id": "tekstowy-identyfikator-z-zapiera-lub-excela",
  "source_record_id": null,
  "payload": {
    "...pola briefu z arkusza..."
  }
}
```

> **Ważne:** Używaj `source_external_id` dla identyfikatorów z Excela/Zapier/Meta.
> Pole `source_record_id` jest opcjonalne i akceptuje **wyłącznie poprawne UUID**.
> Jeśli podasz tekstowy ID w `source_record_id`, zostanie automatycznie przeniesiony do `source_external_id`.
>
> `source_external_id` może być: numer wiersza, ID rekordu z arkusza, wartość z Zapier (np. `Domy-{{Row ID}}`), ID z Meta Lead Ads.

---

## Przykład: Domy

```json
{
  "source_type": "website_domy",
  "investment_type": "dom",
  "source_form_name": "METICAL_Briefy/Domy",
  "source_campaign": null,
  "source_external_id": "Domy-001",
  "payload": {
    "D-01 Etap": "Planuję budowę",
    "D-02 Termin": "W ciągu 12 miesięcy",
    "D-03 Działka": "Tak, mam działkę",
    "D-04 Lokalizacja": "Kraków",
    "D-05 Plan/WZ": "Mam plan zagospodarowania",
    "D-06 Dokumenty": "Komplet dokumentów",
    "D-07 Projekt": "Mam gotowy projekt",
    "D-08 Wsparcie": "Budowa pod klucz",
    "D-09 Metraż": "120-150 m²",
    "D-10 Układ": "Parterowy",
    "D-11 Priorytety": "Energooszczędność, nowoczesny design",
    "D-12 Imię i nazwisko": "Jan Kowalski",
    "D-13 Telefon": "+48 600 100 200",
    "D-14 E-mail": "jan@example.com",
    "D-15 Uwagi": "Interesuje mnie dom stalowy z płaskim dachem"
  }
}
```

## Przykład: Hale

```json
{
  "source_type": "website_hale",
  "investment_type": "hala",
  "source_form_name": "METICAL_Briefy/Hale",
  "source_campaign": null,
  "source_external_id": "Hale-001",
  "payload": {
    "H-01 Obiekt": "Hala magazynowa",
    "H-02 Rodzaj": "Nowa budowa",
    "H-03 Termin": "6 miesięcy",
    "H-04 Działka": "Tak",
    "H-05 Plan/WZ": "W trakcie",
    "H-06 Projekt": "Nie mam jeszcze",
    "H-07 Szerokość": "20m",
    "H-08 Długość": "40m",
    "H-09 Wysokość": "8m",
    "H-10 Dach": "Dwuspadowy",
    "H-11 Forma": "Stalowa",
    "H-12 Tryb": "Pozwolenie na budowę",
    "H-13 Zakres": "Konstrukcja + obudowa",
    "H-14 Firma/osoba": "ABC Sp. z o.o. / Adam Nowak",
    "H-15 Telefon": "+48 500 300 400",
    "H-16 E-mail": "adam@abc.pl",
    "H-17 Uwagi": "Potrzebujemy 2 bramy segmentowe 4x4m"
  }
}
```

## Przykład: Instalacje

```json
{
  "source_type": "website_instalacje",
  "investment_type": "instalacja",
  "source_form_name": "METICAL_Briefy/Instalacje",
  "source_campaign": null,
  "source_external_id": "Inst-001",
  "payload": {
    "I-01 Zakres": "Hydraulika + elektryka",
    "I-02 Obiekt": "Dom jednorodzinny",
    "I-03 Lokalizacja": "Warszawa, Mokotów",
    "I-04 Typ inwestycji": "Remont",
    "I-05 Termin": "3 miesiące",
    "I-06 Potrzeby": "Wymiana instalacji wodnej i elektrycznej",
    "I-07 Telefon": "+48 700 800 900",
    "I-08 E-mail": "klient@example.com",
    "I-09 Opis tematu": "Dom z lat 70., pełna wymiana rur i przewodów"
  }
}
```

---

## Odpowiedzi

### Sukces
```json
{ "ok": true, "lead_id": "uuid", "duplicate": false }
```

### Duplikat
```json
{ "ok": true, "duplicate": true, "lead_id": "uuid" }
```

### Błąd walidacji (400)
```json
{ "ok": false, "error": "source_type, investment_type, and payload are required" }
```

### Brak autoryzacji (401)
```json
{ "ok": false, "error": "Unauthorized" }
```

### Błąd serwera (500)
```json
{ "ok": false, "error": "internal_error" }
```

---

## Konfiguracja Supabase

### 1. Ustaw sekret

```bash
npx supabase secrets set LEAD_INGEST_SECRET=twoj-silny-losowy-sekret-min-32-znaki
```

### 2. Deploy funkcji

```bash
npx supabase functions deploy ingest-lead
```

### 3. Test curl

```bash
curl -X POST \
  https://<PROJECT_REF>.supabase.co/functions/v1/ingest-lead \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: twoj-silny-losowy-sekret-min-32-znaki" \
  -d '{
    "source_type": "website_domy",
    "investment_type": "dom",
    "payload": {
      "D-12 Imię i nazwisko": "Test Lead",
      "D-13 Telefon": "+48 111 222 333"
    }
  }'
```

---

## Konfiguracja Zapier

### Trigger
- **App:** Microsoft Excel (lub Microsoft 365 Excel)
- **Event:** New Row in Worksheet
- **Arkusz:** METICAL_Briefy
- **Podarkusz:** Domy / Hale / Instalacje

### Action
- **App:** Webhooks by Zapier
- **Event:** POST
- **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/ingest-lead`
- **Payload Type:** JSON
- **Headers:**
  - `x-ingest-secret`: `<wartość LEAD_INGEST_SECRET>`
  - `Content-Type`: `application/json`

### Body (przykład Domy)
Zmapuj kolumny z arkusza Excel do pól payload:

```json
{
  "source_type": "website_domy",
  "investment_type": "dom",
  "source_form_name": "METICAL_Briefy/Domy",
  "source_external_id": "Domy-{{Row ID lub numer wiersza z Zapier}}",
  "payload": {
    "D-01 Etap": "{{kolumna Etap}}",
    "D-02 Termin": "{{kolumna Termin}}",
    "D-03 Działka": "{{kolumna Działka}}",
    "D-04 Lokalizacja": "{{kolumna Lokalizacja}}",
    "D-12 Imię i nazwisko": "{{kolumna Imię i nazwisko}}",
    "D-13 Telefon": "{{kolumna Telefon}}",
    "D-14 E-mail": "{{kolumna E-mail}}"
  }
}
```

> **Ważne:** Ustaw osobny Zap dla każdego podarkusza (Domy, Hale, Instalacje), zmieniając `source_type` i `investment_type`.

---

## Ochrona przed duplikatami

1. **Priorytet 1:** `source_external_id` — jeśli podano, endpoint sprawdza czy lead z tym samym `source_type` + `source_external_id` już istnieje.
2. **Priorytet 2:** `source_record_id` (UUID) — jeśli podano poprawny UUID.
3. **Priorytet 3:** Fallback po `source_type` + `contact_phone` lub `contact_email` z ostatnich 24h.
4. Duplikat zwraca `200 OK` z `duplicate: true` — Zapier nie widzi błędu.
5. Jeśli `source_record_id` nie jest UUID, wartość trafia automatycznie do `source_external_id`.
