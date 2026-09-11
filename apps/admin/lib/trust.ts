/**
 * Safety, disputes and trust fixtures.
 *
 * Incidents are a safety RECORD, not a ticket queue. Dahab has a hyperbaric
 * chamber and diving incidents are a real category, so a decompression illness
 * report carries what happened, who was involved, whether the chamber was
 * used, and what changed as a result — the last one being the part that makes
 * it a record rather than a log.
 */

/** `incident_severity` */
export type IncidentSeverity = 'nearMiss' | 'minor' | 'serious' | 'critical';

/** `incident_kind` */
export type IncidentKind =
  | 'divingIncident'
  | 'decompressionIllness'
  | 'equipmentFailure'
  | 'vesselIncident'
  | 'vehicleIncident'
  | 'medicalEmergency'
  | 'marineLifeInjury'
  | 'weatherEvent'
  | 'lostDiver'
  | 'other';

/** `dispute_status` */
export type DisputeStatus =
  | 'open'
  | 'awaitingTraveler'
  | 'awaitingVendor'
  | 'underReview'
  | 'resolved'
  | 'escalated'
  | 'closed';

/** `moderation_status` */
export type ModerationStatus = 'published' | 'pendingReview' | 'hidden' | 'removed';

export interface Incident {
  readonly id: string;
  readonly kind: IncidentKind;
  readonly severity: IncidentSeverity;
  readonly vendor: string;
  readonly site: string;
  readonly at: string;
  /** True where the Dahab hyperbaric chamber was involved. */
  readonly chamber: boolean;
  /** What changed because of it. Empty while the review is still open. */
  readonly outcome: string | null;
}

export const INCIDENTS: readonly Incident[] = [
  {
    id: 'i-1',
    kind: 'decompressionIllness',
    severity: 'serious',
    vendor: 'Fanous Divers',
    site: 'The Bells',
    at: '2026-08-29T07:40:00Z',
    chamber: true,
    outcome: 'Ascent-rate briefing added to every Bells departure; guide ratio cut to 1:3.',
  },
  {
    id: 'i-2',
    kind: 'equipmentFailure',
    severity: 'minor',
    vendor: 'Fanous Divers',
    site: 'The Bells',
    at: '2026-09-09T06:40:00Z',
    chamber: false,
    outcome: null,
  },
  {
    id: 'i-3',
    kind: 'lostDiver',
    severity: 'nearMiss',
    vendor: 'Blue Beach Freediving',
    site: 'Blue Hole',
    at: '2026-09-08T07:15:00Z',
    chamber: false,
    outcome: 'Buddy-pair check moved to the water rather than the shore.',
  },
  {
    id: 'i-4',
    kind: 'vesselIncident',
    severity: 'minor',
    vendor: 'Shamandura Boat Trips',
    site: 'The Islands',
    at: '2026-08-14T09:05:00Z',
    chamber: false,
    outcome: 'Engine service brought forward; second bilge pump fitted.',
  },
];

export interface Dispute {
  readonly id: string;
  readonly bookingRef: string;
  readonly traveler: string;
  readonly vendor: string;
  readonly status: DisputeStatus;
  readonly amountMinor: number;
  readonly opened: string;
  readonly reason: string;
}

export const DISPUTES: readonly Dispute[] = [
  {
    id: 'd-1',
    bookingRef: 'DF-4460',
    traveler: 'Nadia Haddad',
    vendor: 'Baraka Kite',
    status: 'underReview',
    amountMinor: 180_000,
    opened: '2026-09-08',
    reason: 'Lesson cut short; wind dropped below teaching minimum.',
  },
  {
    id: 'd-2',
    bookingRef: 'DF-4438',
    traveler: 'Erik Johansson',
    vendor: 'Baraka Kite',
    status: 'awaitingVendor',
    amountMinor: 96_000,
    opened: '2026-09-06',
    reason: 'Equipment size not as booked.',
  },
];

export interface ModerationItem {
  readonly id: string;
  readonly kind: 'review' | 'question' | 'message';
  readonly author: string;
  readonly subject: string;
  readonly status: ModerationStatus;
  readonly flaggedFor: string;
}

export const MODERATION: readonly ModerationItem[] = [
  {
    id: 'm-1',
    kind: 'review',
    author: 'Anonymous traveller',
    subject: 'Baraka Kite',
    status: 'pendingReview',
    flaggedFor: 'Names a staff member',
  },
  {
    id: 'm-2',
    kind: 'question',
    author: 'Hana Okonkwo',
    subject: 'The Arch · certification',
    status: 'published',
    flaggedFor: '—',
  },
  {
    id: 'm-3',
    kind: 'message',
    author: 'Guest session',
    subject: 'Fanous Divers',
    status: 'hidden',
    flaggedFor: 'Contact details off-platform',
  },
];

/**
 * Impersonation is audited, time-boxed and obvious while it is running.
 * `user.impersonate` exists so support can reproduce a fault, not so an admin
 * can browse as someone else.
 */
export interface ImpersonationRule {
  readonly maxMinutes: number;
  readonly requiresReason: boolean;
  readonly writesAudit: boolean;
  readonly bannerWhileActive: boolean;
}

export const IMPERSONATION: ImpersonationRule = {
  maxMinutes: 30,
  requiresReason: true,
  writesAudit: true,
  bannerWhileActive: true,
};
