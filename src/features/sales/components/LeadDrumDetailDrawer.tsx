import type { SalesLead, UserProfile, LeadQualificationStatus, LeadQuality } from '@/types/database';
import {
  QUALIFICATION_STATUS_LABELS, QUALIFICATION_STATUS_COLORS, QUALIFICATION_STATUSES,
  LEAD_QUALITY_LABELS, LEAD_QUALITY_COLORS, LEAD_QUALITIES,
  SALES_STATUS_LABELS, LEAD_SOURCE_TYPE_LABELS, LEAD_SOURCE_LABELS,
  LEAD_INVESTMENT_TYPE_LABELS,
} from '@/lib/constants';
import { X, User, Tag, Globe, FileText } from 'lucide-react';

interface Props {
  lead: SalesLead;
  profiles: UserProfile[];
  onClose: () => void;
  onQualStatus: (id: string, qs: LeadQualificationStatus) => void;
  onQuality: (id: string, q: LeadQuality | null) => void;
  onAssign: (id: string, userId: string | null) => void;
}

function fb(a: string | null | undefined, b: string | null | undefined): string {
  return a || b || '—';
}

function profileName(pid: string | null, profiles: UserProfile[]): string {
  if (!pid) return '—';
  const p = profiles.find(x => x.id === pid);
  return p ? (p.full_name || p.email) : pid.slice(0, 8);
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-xs font-semibold text-muted-500 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-[11px] text-muted-400 w-[130px] shrink-0">{label}</span>
      <span className="text-sm text-gray-800 break-words">{value}</span>
    </div>
  );
}

export default function LeadDrumDetailDrawer({ lead, profiles, onClose, onQualStatus, onQuality, onAssign }: Props) {
  const qs = lead.qualification_status as LeadQualificationStatus;
  const qc = QUALIFICATION_STATUS_COLORS[qs] || '#9ca3af';
  const lq = lead.lead_quality as LeadQuality | null;
  const srcLabel = lead.source_type
    ? (LEAD_SOURCE_TYPE_LABELS[lead.source_type] || lead.source_type)
    : (LEAD_SOURCE_LABELS[lead.source] || lead.source);
  const invLabel = lead.investment_type
    ? (LEAD_INVESTMENT_TYPE_LABELS[lead.investment_type] || lead.investment_type)
    : (lead.service_type || '—');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-surface-100 flex items-center gap-3">
          <h3 className="text-base font-bold text-gray-900 flex-1 truncate">{fb(lead.contact_name, lead.full_name)}</h3>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: qc + '18', color: qc }}>
            {QUALIFICATION_STATUS_LABELS[qs]}
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center hover:bg-surface-200">
            <X size={16} className="text-muted-500" />
          </button>
        </div>

        <div className="p-5">
          {/* ─── Actions ───────────────────────────────── */}
          <Section title="Akcje admina" icon={<Tag size={14} className="text-primary-500" />}>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted-400 mb-1">Status kwalifikacji</label>
                <select value={qs} onChange={e => onQualStatus(lead.id, e.target.value as LeadQualificationStatus)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-surface-200 bg-surface-50 cursor-pointer">
                  {QUALIFICATION_STATUSES.map(s => <option key={s} value={s}>{QUALIFICATION_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-muted-400 mb-1">Jakość leadu</label>
                <div className="flex gap-1.5">
                  {LEAD_QUALITIES.map(q => (
                    <button key={q} onClick={() => onQuality(lead.id, lq === q ? null : q)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ backgroundColor: lq === q ? LEAD_QUALITY_COLORS[q] : '#f3f4f6', color: lq === q ? 'white' : '#6b7280' }}>
                      {LEAD_QUALITY_LABELS[q]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-400 mb-1">Przypisany do</label>
                <select value={lead.assigned_user_id || lead.primary_assigned_to || ''}
                  onChange={e => onAssign(lead.id, e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-surface-200 bg-surface-50 cursor-pointer">
                  <option value="">— brak —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* ─── Contact ───────────────────────────────── */}
          <Section title="Dane kontaktowe" icon={<User size={14} className="text-primary-500" />}>
            <Row label="Imię / Nazwa" value={fb(lead.contact_name, lead.full_name)} />
            <Row label="Telefon" value={fb(lead.contact_phone, lead.phone)} />
            <Row label="E-mail" value={fb(lead.contact_email, lead.email)} />
            <Row label="Lokalizacja" value={fb(lead.location_text, lead.city)} />
            <Row label="Kod pocztowy" value={lead.postal_code} />
            <Row label="Termin" value={lead.desired_timeline} />
          </Section>

          {/* ─── Source ─────────────────────────────────── */}
          <Section title="Źródło" icon={<Globe size={14} className="text-primary-500" />}>
            <Row label="Źródło (nowe)" value={srcLabel} />
            <Row label="Źródło (stare)" value={LEAD_SOURCE_LABELS[lead.source] || lead.source} />
            <Row label="Kampania" value={lead.source_campaign} />
            <Row label="Formularz" value={lead.source_form_name} />
            <Row label="Record ID" value={lead.source_record_id} />
          </Section>

          {/* ─── Qualification ──────────────────────────── */}
          <Section title="Kwalifikacja / Status" icon={<FileText size={14} className="text-primary-500" />}>
            <Row label="Typ inwestycji" value={invLabel} />
            <Row label="Typ usługi (stare)" value={lead.service_type} />
            <Row label="Sales status" value={SALES_STATUS_LABELS[lead.sales_status] || lead.sales_status} />
            <Row label="Stary status" value={lead.status} />
            <Row label="Notatka kwalif." value={lead.qualification_note} />
            <Row label="Follow-up" value={lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString('pl-PL') : null} />
            <Row label="Notatka follow-up" value={lead.follow_up_note} />
            <Row label="Następny krok" value={lead.next_step_at ? new Date(lead.next_step_at).toLocaleString('pl-PL') : null} />
            <Row label="Notatka nast. krok" value={lead.next_step_note} />
            <Row label="Przypisany do" value={profileName(lead.assigned_user_id || lead.primary_assigned_to, profiles)} />
            <Row label="Przypisany przez" value={profileName(lead.assigned_by, profiles)} />
            <Row label="Data przypisania" value={lead.assigned_at ? new Date(lead.assigned_at).toLocaleString('pl-PL') : null} />
            <Row label="Utworzony przez" value={profileName(lead.created_by, profiles)} />
          </Section>

          {/* ─── Brief: Domy ────────────────────────────── */}
          {(lead.investment_type === 'dom' || lead.house_interest_type) && (
            <Section title="Brief — Domy" icon={<FileText size={14} className="text-amber-500" />}>
              <Row label="Zainteresowanie" value={lead.house_interest_type} />
              <Row label="Działka" value={lead.has_plot} />
              <Row label="Etap decyzji" value={lead.decision_stage} />
              <Row label="Planowanie" value={lead.planning_status} />
              <Row label="Dokumentacja" value={lead.documentation_status} />
              <Row label="Projekt" value={lead.project_status} />
              <Row label="Zakres wsparcia" value={lead.expected_support_scope} />
              <Row label="Powierzchnia" value={lead.house_area_range} />
              <Row label="Układ" value={lead.house_layout_type} />
              <Row label="Priorytety" value={lead.client_priorities} />
            </Section>
          )}

          {/* ─── Brief: Hale ────────────────────────────── */}
          {(lead.investment_type === 'hala' || lead.hall_interest_type) && (
            <Section title="Brief — Hale" icon={<FileText size={14} className="text-blue-500" />}>
              <Row label="Zainteresowanie" value={lead.hall_interest_type} />
              <Row label="Typ obiektu" value={lead.hall_object_type} />
              <Row label="Typ hali" value={lead.hall_type} />
              <Row label="Rodzaj inwest." value={lead.hall_investment_kind} />
              <Row label="Projekt archit." value={lead.has_architectural_project} />
              <Row label="Planowanie" value={lead.hall_planning_status} />
              <Row label="Projekt" value={lead.hall_project_status} />
              <Row label="Szerokość" value={lead.hall_width} />
              <Row label="Długość" value={lead.hall_length} />
              <Row label="Wysokość" value={lead.hall_height} />
              <Row label="Dach" value={lead.roof_type} />
              <Row label="Forma hali" value={lead.hall_form} />
              <Row label="Tryb pozwolenia" value={lead.permit_mode} />
              <Row label="Zakres" value={lead.expected_scope} />
              <Row label="Ściany" value={lead.wall_covering} />
              <Row label="Pokrycie dachu" value={lead.roof_covering} />
              <Row label="Bramy/Okna" value={lead.gate_doors_windows_info} />
              <Row label="Opis inwestycji" value={lead.investment_description_raw} />
            </Section>
          )}

          {/* ─── Brief: Instalacje ──────────────────────── */}
          {(lead.investment_type === 'instalacja' || lead.installation_scope) && (
            <Section title="Brief — Instalacje" icon={<FileText size={14} className="text-green-500" />}>
              <Row label="Zakres" value={lead.installation_scope} />
              <Row label="Typ obiektu" value={lead.installation_object_type} />
              <Row label="Rodzaj inwest." value={lead.installation_investment_kind} />
              <Row label="Potrzeby klienta" value={lead.installation_client_needs} />
              <Row label="Opis" value={lead.installation_description_raw} />
            </Section>
          )}

          {/* ─── Raw Payload ────────────────────────────── */}
          <Section title="Raw payload" icon={<Globe size={14} className="text-muted-400" />}>
            {lead.source_payload_raw ? (
              <pre className="text-xs bg-surface-50 p-3 rounded-lg overflow-x-auto max-h-60 text-muted-600 border border-surface-200">
                {JSON.stringify(lead.source_payload_raw, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-400 italic">Brak surowych danych źródłowych</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
