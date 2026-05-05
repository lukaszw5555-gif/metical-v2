// ─── Task ────────────────────────────────────────────────

export type TaskStatus = 'do_zrobienia' | 'w_trakcie' | 'czeka' | 'zrobione';

export type TaskPriority = 'normalny' | 'pilny' | 'krytyczny';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string; // ISO date string (YYYY-MM-DD)
  created_by: string; // user id
  assigned_to: string | null; // user id
  investment_id: string | null;
  awaiting_response: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_activity_at: string;
  last_bumped_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

// ─── Investment ──────────────────────────────────────────

export type InvestmentType =
  | 'pv'
  | 'pv_magazyn'
  | 'magazyn'
  | 'pompa_ciepla'
  | 'hydraulika'
  | 'elektryka'
  | 'hala'
  | 'dom'
  | 'kompleksowa_usluga';

export type InvestmentStatus =
  | 'czeka_na_wplate'
  | 'w_planowaniu'
  | 'w_realizacji'
  | 'zakonczona';

export interface Investment {
  id: string;
  name: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  investment_address: string | null;
  investment_type: InvestmentType;
  status: InvestmentStatus;
  deposit_paid: boolean;
  components_note: string | null;
  created_by: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
}

// ─── Investment Member ───────────────────────────────────

export interface InvestmentMember {
  investment_id: string;
  user_id: string;
  assigned_at: string;
}

// ─── User Profile ────────────────────────────────────────

export type UserRole = 'admin' | 'operator' | 'administracja';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Task Comment ────────────────────────────────────────

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

// ─── Investment Comment ──────────────────────────────────

export interface InvestmentComment {
  id: string;
  investment_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

// ─── Notification ────────────────────────────────────────

export type NotificationType =
  | 'task_created'
  | 'task_comment_added'
  | 'task_bumped'
  | 'task_status_changed'
  | 'investment_created'
  | 'investment_comment_added'
  | 'investment_status_changed'
  | 'comment_added'
  | 'investment_comment'
  | 'investment_edited';

export type NotificationPriority = 'normal' | 'critical';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  task_id: string | null;
  investment_id: string | null;
  is_read: boolean;
  priority: NotificationPriority;
  created_at: string;
}

// ─── Activity Log ────────────────────────────────────────

export type ActivityEventType =
  | 'comment_added'
  | 'task_created'
  | 'task_created_for_investment'
  | 'task_comment_added'
  | 'task_status_changed'
  | 'status_changed'
  | 'task_bumped'
  | 'task_edited'
  | 'task_archived'
  | 'investment_created'
  | 'investment_edited'
  | 'investment_comment'
  | 'investment_comment_added'
  | 'investment_status_changed'
  | 'investment_archived'
  | 'investment_restored';

export type ActivityEntityType = 'task' | 'investment';

export interface ActivityLogEntry {
  id: string;
  actor_id: string;
  event_type: ActivityEventType;
  entity_type: ActivityEntityType;
  entity_id: string;
  task_id: string | null;
  investment_id: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Sales Lead ──────────────────────────────────────────

export type SalesLeadStatus = 'new' | 'follow_up' | 'offered' | 'won' | 'lost';

export type SalesLeadSource = 'website' | 'facebook_ads' | 'manual';

export type SalesServiceType =
  | 'pv'
  | 'pv_magazyn'
  | 'magazyn'
  | 'pompa_ciepla'
  | 'hydraulika'
  | 'elektryka'
  | 'hala'
  | 'dom'
  | 'kompleksowa_usluga'
  | 'inne';

// ─── Lead Drum Types (MET-FUNNEL-002) ────────────────────

export type LeadSourceType =
  | 'website_domy'
  | 'website_hale'
  | 'website_instalacje'
  | 'meta_domy'
  | 'meta_hale'
  | 'manual'
  | 'excel_import'
  | 'other';

export type LeadInvestmentType = 'dom' | 'hala' | 'instalacja' | 'pv' | 'inne';

export type LeadQualificationStatus =
  | 'new'
  | 'to_review'
  | 'valuable'
  | 'education_needed'
  | 'incomplete'
  | 'useless'
  | 'spam'
  | 'assigned'
  | 'converted'
  | 'lost';

export type LeadQuality = 'A' | 'B' | 'C' | 'D' | 'X';

export type LeadSalesStatus =
  | 'not_started'
  | 'first_contact_pending'
  | 'contacted'
  | 'no_answer'
  | 'follow_up'
  | 'meeting_scheduled'
  | 'offer_needed'
  | 'offer_sent'
  | 'won'
  | 'lost';

export type LeadNoteType = 'general' | 'qualification' | 'contact' | 'internal';

// ─── Sales Lead Interface ────────────────────────────────

export interface SalesLead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  source: SalesLeadSource;
  service_type: SalesServiceType | null;
  qualification_note: string | null;
  status: SalesLeadStatus;
  is_favorite: boolean;
  primary_assigned_to: string | null;
  secondary_assigned_to: string | null;
  created_by: string;
  next_follow_up_at: string | null;
  follow_up_note: string | null;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;

  // ─── Drum fields (MET-FUNNEL-002) — all nullable ───────
  // Source
  source_type: LeadSourceType | null;
  source_record_id: string | null;
  source_external_id: string | null;
  source_payload_raw: Record<string, unknown> | null;
  source_campaign: string | null;
  source_form_name: string | null;
  // Investment type
  investment_type: LeadInvestmentType | null;
  // Unified contact
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location_text: string | null;
  postal_code: string | null;
  desired_timeline: string | null;
  // Qualification
  qualification_status: LeadQualificationStatus;
  lead_quality: LeadQuality | null;
  // Assignment
  assigned_user_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  // Sales workflow
  sales_status: LeadSalesStatus;
  last_contact_at: string | null;
  next_step_at: string | null;
  next_step_note: string | null;
  // Conversion
  converted_investment_id: string | null;
  // Brief: Domy
  house_interest_type: string | null;
  has_plot: string | null;
  decision_stage: string | null;
  planning_status: string | null;
  documentation_status: string | null;
  project_status: string | null;
  expected_support_scope: string | null;
  house_area_range: string | null;
  house_layout_type: string | null;
  client_priorities: string | null;
  // Brief: Hale
  hall_interest_type: string | null;
  hall_object_type: string | null;
  hall_type: string | null;
  hall_investment_kind: string | null;
  has_architectural_project: string | null;
  hall_planning_status: string | null;
  hall_project_status: string | null;
  hall_width: string | null;
  hall_length: string | null;
  hall_height: string | null;
  roof_type: string | null;
  hall_form: string | null;
  permit_mode: string | null;
  expected_scope: string | null;
  wall_covering: string | null;
  roof_covering: string | null;
  gate_doors_windows_info: string | null;
  investment_description_raw: string | null;
  // Brief: Instalacje
  installation_scope: string | null;
  installation_object_type: string | null;
  installation_investment_kind: string | null;
  installation_client_needs: string | null;
  installation_description_raw: string | null;
}

// ─── Lead Comment ────────────────────────────────────────

export interface LeadComment {
  id: string;
  lead_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

// ─── Lead Note (MET-FUNNEL-002) ──────────────────────────

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  note_type: LeadNoteType;
  body: string;
  created_at: string;
}
