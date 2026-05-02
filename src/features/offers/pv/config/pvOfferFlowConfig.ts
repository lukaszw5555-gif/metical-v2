import type { PvOfferType } from '../types/pvOfferTypes';

// ─── Step definition ─────────────────────────────────────

export interface PvOfferFlowStep {
  key: string;
  label: string;
  category: string;
  required: boolean;
  description?: string;
}

export interface PvOfferFlowConfig {
  label: string;
  description: string;
  requiredSteps: PvOfferFlowStep[];
  optionalSteps: PvOfferFlowStep[];
  autoItemsHint: string[];
}

// ─── Flow definitions ────────────────────────────────────

const PV_FLOW: PvOfferFlowConfig = {
  label: 'Fotowoltaika',
  description: 'Standardowa instalacja PV bez magazynu energii',
  requiredSteps: [
    { key: 'panels', label: 'Panele', category: 'Moduły fotowoltaiczne', required: true },
    { key: 'structure', label: 'Konstrukcja montażowa', category: 'Konstrukcje montażowe', required: true },
    { key: 'inverter', label: 'Falownik', category: 'Falowniki', required: true },
    { key: 'materials', label: 'Materiały pomocnicze', category: 'Materiały pomocnicze', required: true },
    { key: 'switchgear', label: 'Skrzynki / rozdzielnice', category: 'Skrzynki / rozdzielnice', required: true },
    { key: 'install_pv', label: 'Montaż PV', category: 'Dodatkowe usługi', required: true },
  ],
  optionalSteps: [
    { key: 'extras', label: 'Dodatki', category: 'Dodatkowe usługi', required: false },
  ],
  autoItemsHint: [
    'Zgłoszenie do zakładu energetycznego — zostanie dodane automatycznie w przyszłym sprincie.',
  ],
};

const PV_ME_FLOW: PvOfferFlowConfig = {
  label: 'Fotowoltaika + magazyn energii',
  description: 'Instalacja PV z magazynem energii',
  requiredSteps: [
    { key: 'panels', label: 'Panele', category: 'Moduły fotowoltaiczne', required: true },
    { key: 'structure', label: 'Konstrukcja montażowa', category: 'Konstrukcje montażowe', required: true },
    { key: 'inverter', label: 'Falownik', category: 'Falowniki', required: true },
    { key: 'storage', label: 'Magazyn energii', category: 'Magazyny energii', required: true },
    { key: 'materials', label: 'Materiały pomocnicze', category: 'Materiały pomocnicze', required: true },
    { key: 'switchgear', label: 'Skrzynki / rozdzielnice', category: 'Skrzynki / rozdzielnice', required: true },
    { key: 'install_pv', label: 'Montaż PV', category: 'Dodatkowe usługi', required: true },
    { key: 'install_me', label: 'Montaż magazynu energii', category: 'Dodatkowe usługi', required: true },
  ],
  optionalSteps: [
    { key: 'backup', label: 'Backup', category: 'Backup', required: false, description: 'Jeden domyślny produkt backup.' },
    { key: 'fire_switch', label: 'Wyłącznik ppoż.', category: 'Wyłącznik ppoż.', required: false, description: 'Docelowo wariant do 10 kW albo 10–20 kW.' },
    { key: 'extras', label: 'Dodatki', category: 'Dodatkowe usługi', required: false },
  ],
  autoItemsHint: [
    'Zgłoszenie do zakładu energetycznego — zostanie dodane automatycznie w przyszłym sprincie.',
  ],
};

const ME_FLOW: PvOfferFlowConfig = {
  label: 'Magazyn energii',
  description: 'Sam magazyn energii lub rozbudowa istniejącej instalacji',
  requiredSteps: [
    { key: 'storage', label: 'Magazyn energii', category: 'Magazyny energii', required: true },
    { key: 'materials', label: 'Materiały pomocnicze', category: 'Materiały pomocnicze', required: true },
    { key: 'install_me', label: 'Montaż magazynu energii', category: 'Dodatkowe usługi', required: true },
  ],
  optionalSteps: [
    { key: 'inverter', label: 'Falownik', category: 'Falowniki', required: false, description: 'Opcjonalny, jeśli inwestycja wymaga wymiany/dodania falownika.' },
    { key: 'backup', label: 'Backup', category: 'Backup', required: false },
    { key: 'extras', label: 'Dodatki', category: 'Dodatkowe usługi', required: false },
  ],
  autoItemsHint: [
    'Zgłoszenie do zakładu energetycznego — zostanie dodane automatycznie w przyszłym sprincie.',
  ],
};

const INDIVIDUAL_FLOW: PvOfferFlowConfig = {
  label: 'Oferta indywidualna',
  description: 'Dowolna konfiguracja bez wymaganych kroków',
  requiredSteps: [],
  optionalSteps: [],
  autoItemsHint: [],
};

// ─── Lookup ──────────────────────────────────────────────

export const PV_OFFER_FLOWS: Record<PvOfferType, PvOfferFlowConfig> = {
  pv: PV_FLOW,
  pv_me: PV_ME_FLOW,
  me: ME_FLOW,
  individual: INDIVIDUAL_FLOW,
};

export function getOfferFlow(type: PvOfferType): PvOfferFlowConfig {
  return PV_OFFER_FLOWS[type];
}
