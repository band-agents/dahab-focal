import { formatCurrency, formatDate, money } from '@dahab/i18n/server';
import { DataTable, Mark, Panel, StatusPill } from '@dahab/ui-web';
import type { Column, MarkName, StatusTone } from '@dahab/ui-web';

import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { translator } from '@/lib/i18n';
import { DISPUTES, IMPERSONATION, INCIDENTS, MODERATION } from '@/lib/trust';
import type {
  Dispute,
  DisputeStatus,
  Incident,
  IncidentSeverity,
  ModerationItem,
  ModerationStatus,
} from '@/lib/trust';

/**
 * A07 · Safety, disputes and trust.
 *
 * Incidents are a RECORD, not a ticket queue, and the difference is the
 * outcome column: every closed report carries what changed because of it. A
 * decompression illness at The Bells that produced a briefing change and a
 * tighter guide ratio is worth more to the next diver than a resolved ticket.
 *
 * Impersonation is stated rather than buried: support reproduces a fault as
 * the user, which is not the same as browsing as one.
 */

const SEVERITY_TONE: Record<IncidentSeverity, StatusTone> = {
  nearMiss: 'info',
  minor: 'warning',
  serious: 'danger',
  critical: 'danger',
};

const SEVERITY_MARK: Record<IncidentSeverity, MarkName> = {
  nearMiss: 'chat',
  minor: 'firstAid',
  serious: 'sos',
  critical: 'sos',
};

const DISPUTE_TONE: Record<DisputeStatus, StatusTone> = {
  open: 'warning',
  awaitingTraveler: 'info',
  awaitingVendor: 'info',
  underReview: 'warning',
  resolved: 'success',
  escalated: 'danger',
  closed: 'neutral',
};

const MODERATION_TONE: Record<ModerationStatus, StatusTone> = {
  published: 'success',
  pendingReview: 'warning',
  hidden: 'neutral',
  removed: 'danger',
};

export default async function TrustPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const incidentColumns: readonly Column<Incident>[] = [
    {
      key: 'kind',
      header: t('admin.col.service'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{t(`admin.incidentKind.${row.kind}`)}</span>
          <span className="block text-small text-text-muted">
            {row.vendor} · {row.site}
          </span>
        </span>
      ),
    },
    {
      key: 'at',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'date'),
      width: '11rem',
    },
    {
      key: 'severity',
      header: t('admin.col5.severity'),
      width: '12rem',
      cell: (row) => (
        <span className="flex flex-col gap-1">
          <StatusPill tone={SEVERITY_TONE[row.severity]} mark={SEVERITY_MARK[row.severity]}>
            {t(`admin.severity.${row.severity}`)}
          </StatusPill>
          {row.chamber ? (
            // The chamber is six minutes away and its use is a material fact
            // about the incident, not a footnote.
            <span className="flex items-center gap-2 text-caption text-danger-text-on-cream">
              <Mark name="chamber" size={16} noFlip />
              {t('admin.trust.chamber')}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'outcome',
      header: t('admin.col5.outcome'),
      cell: (row) =>
        row.outcome === null ? (
          <span className="text-small text-text-muted">{t('admin.trust.outcomePending')}</span>
        ) : (
          <span className="text-small text-text">{row.outcome}</span>
        ),
    },
  ];

  const disputeColumns: readonly Column<Dispute>[] = [
    {
      key: 'ref',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-small text-text">{row.bookingRef}</span>,
    },
    {
      key: 'parties',
      header: t('admin.col4.traveler'),
      cell: (row) => (
        <span className="block">
          <span className="block text-body text-text">{row.traveler}</span>
          <span className="block text-small text-text-muted">{row.vendor}</span>
        </span>
      ),
    },
    { key: 'reason', header: t('admin.col5.reason'), cell: (row) => row.reason },
    {
      key: 'opened',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(`${row.opened}T00:00:00Z`), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <StatusPill
          tone={DISPUTE_TONE[row.status]}
          mark={row.status === 'escalated' ? 'sos' : 'chat'}
        >
          {t(`admin.disputeStatus.${row.status}`)}
        </StatusPill>
      ),
    },
    {
      key: 'amount',
      header: t('admin.col4.total'),
      numeric: true,
      width: '10rem',
      cell: (row) => formatCurrency(money(row.amountMinor, 'EGP'), context),
    },
  ];

  const moderationColumns: readonly Column<ModerationItem>[] = [
    { key: 'subject', header: t('admin.col.vendor'), cell: (row) => row.subject, width: '14rem' },
    { key: 'author', header: t('admin.col5.actor'), cell: (row) => row.author },
    { key: 'flagged', header: t('admin.col5.reason'), cell: (row) => row.flaggedFor },
    {
      key: 'status',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <StatusPill
          tone={MODERATION_TONE[row.status]}
          mark={row.status === 'removed' ? 'sos' : row.status === 'published' ? 'eco' : 'chat'}
        >
          {t(`admin.moderationStatus.${row.status}`)}
        </StatusPill>
      ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="trust"
      title={t('admin.trust.title')}
      subtitle={t('admin.trust.subtitle')}
    >
      <div className="flex flex-col gap-8">
        <Panel title={t('admin.trust.incidents')} mark="chamber" flush>
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.trust.incidentsSub')}</p>
          <DataTable
            columns={incidentColumns}
            rows={INCIDENTS}
            rowKey={(row) => row.id}
            caption={t('admin.trust.incidents')}
          />
        </Panel>

        <Panel title={t('admin.trust.disputes')} mark="sos" flush>
          <p className="px-6 pb-3 text-small text-text-muted">{t('admin.trust.disputesSub')}</p>
          <DataTable
            columns={disputeColumns}
            rows={DISPUTES}
            rowKey={(row) => row.id}
            caption={t('admin.trust.disputes')}
          />
        </Panel>

        <Panel title={t('admin.trust.moderation')} mark="chat" flush>
          <DataTable
            columns={moderationColumns}
            rows={MODERATION}
            rowKey={(row) => row.id}
            density="compact"
            caption={t('admin.trust.moderation')}
          />
        </Panel>

        {/*
          Impersonation gets a panel of its own rather than a settings row: the
          admin role holds every permission, and this is the one that most
          needs its limits visible on the screen that offers it.
        */}
        <Panel title={t('admin.trust.impersonation')} mark="mask">
          <p className="max-w-prose text-body text-text-muted">
            {t('admin.trust.impersonationSub', { minutes: IMPERSONATION.maxMinutes })}
          </p>
        </Panel>
      </div>
    </ConsolePage>
  );
}
