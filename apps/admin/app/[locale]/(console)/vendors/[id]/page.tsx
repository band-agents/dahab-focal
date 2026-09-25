import { notFound } from 'next/navigation';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import {
  Action,
  ActionPanel,
  ActionRow,
  Banner,
  KeyValue,
  KeyValueList,
  Meter,
  Panel,
  Pill,
  RecordList,
  Stat,
  StatRow,
  type MeterTone,
  type RecordColumn,
} from '@/components/console';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { bandFor } from '@/lib/expiry';
import { translator } from '@/lib/i18n';
import { OutcomeNotice } from '@/components/ReviewPanel';
import { setVendorStatus } from '@/lib/actions';
import { neighborhoodKey, path, sectionHref } from '@/lib/nav';
import type { Route } from 'next';

/**
 * One operator, seen whole.
 *
 * This is the page the console did not have, and its absence is most of why
 * the console read as a set of reports. Everything about Fanous Divers was on
 * the platform — papers on the expiry board, staff nowhere, services in the
 * catalogue, money in the ledger, incidents in safety — and an admin asking
 * "what is the state of this operator" had to visit five screens and hold the
 * answer in their head.
 *
 * The actions sit here too, on the thing they act on, rather than on a
 * separate administration screen. Suspending an operator belongs beside the
 * expired certificate that is the reason for it.
 */

type Vendor = Awaited<ReturnType<typeof api.admin.vendor.query>>;
type Document = Vendor['documents'][number];
type Staff = Vendor['staff'][number];

/** Hundredths of a star, so the rating never touches the float path. */
const RATING_SCALE = 100;

/** The bands the expiry board uses, as a fraction of the 90-day horizon. */
const HORIZON_DAYS = 90;
const DAY_MS = 86_400_000;

export default async function VendorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ act?: string; outcome?: string }>;
}) {
  const { locale: raw, id } = await params;
  const { act, outcome } = await searchParams;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;
  const now = new Date();

  const vendor = await load(() => api.admin.vendor.query({ id }));

  if (!vendor.ok) {
    // A missing operator is a 404, not an error panel: the id in the URL is
    // wrong, and a screen that renders chrome around "not found" invites a
    // reload that will never work.
    if (vendor.problem.kind === 'notFound') notFound();
    return (
      <ConsolePage
        locale={locale}
        current="vendors"
        title={t('admin.vendors.title')}
        back={{ href: sectionHref(locale, 'vendors'), label: t('admin.action.back') }}
      >
        <DataProblemNotice problem={vendor.problem} t={t} title={t('admin.vendors.title')} />
      </ConsolePage>
    );
  }

  const v = vendor.data;

  const expired = v.documents.filter(
    (row) => bandFor(row.expiresOn, now) === 'expired' && row.blocksPublishing,
  );
  const staffExpiring = v.staff.reduce((total, row) => total + row.certificationsExpiring, 0);
  const here = (query = ''): Route => path(locale, `vendors/${id}${query}`);
  // A name if the owner has one; otherwise how to reach them.
  const ownerLabel = v.owner.displayName ?? v.owner.email ?? v.owner.phone;

  const documentColumns: readonly RecordColumn<Document>[] = [
    {
      key: 'type',
      header: t('admin.col.document'),
      role: 'primary',
      cell: (row) => t(`admin.docType.${row.type}`),
    },
    {
      key: 'issuer',
      header: t('admin.col.issuer'),
      role: 'secondary',
      cell: (row) => row.issuer ?? t('admin.vendor.noIssuer'),
    },
    {
      key: 'number',
      header: t('admin.col.number'),
      role: 'column',
      cell: (row) => row.documentNumber ?? '—',
      width: '12rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      role: 'end',
      width: '13rem',
      cell: (row) => <DocumentPill row={row} now={now} t={t} />,
    },
  ];

  const staffColumns: readonly RecordColumn<Staff>[] = [
    { key: 'name', header: t('admin.col.staff'), role: 'primary', cell: (row) => row.fullName },
    {
      key: 'job',
      header: t('admin.col.jobTitle'),
      role: 'secondary',
      cell: (row) => row.jobTitle ?? t('admin.vendor.noJobTitle'),
    },
    {
      key: 'certs',
      header: t('admin.col.certsExpiring'),
      role: 'end',
      width: '13rem',
      cell: (row) =>
        row.certificationsExpiring === 0 ? (
          row.isActive ? (
            <Pill tone="success" icon="check">
              {t('admin.vendor.staffClear')}
            </Pill>
          ) : (
            <Pill tone="neutral" icon="ban">
              {t('admin.vendor.staffInactive')}
            </Pill>
          )
        ) : (
          <Pill tone="warning" icon="clock">
            {t('admin.vendor.staffExpiring', { count: row.certificationsExpiring })}
          </Pill>
        ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="vendors"
      title={v.displayName}
      subtitle={[
        v.neighborhood === null ? t('admin.vendor.noArea') : t(neighborhoodKey(v.neighborhood)),
        t(`admin.vendorStatus.${v.status}`),
      ].join(' · ')}
      back={{ href: sectionHref(locale, 'vendors'), label: t('admin.action.back') }}
    >
      <Stack>
        {/*
          The papers that are actually stopping this operator trading, stated
          before anything else. An expired public liability certificate is not
          a warning — publishing is blocked right now.
        */}
        {expired.length === 0 ? null : (
          <Banner
            tone="danger"
            icon="ban"
            title={t('admin.vendor.blockedTitle', { count: expired.length })}
            detail={expired.map((row) => t(`admin.docType.${row.type}`)).join(' · ')}
          />
        )}

        {/*
          Actions on the thing, not on a separate screen. Each opens a sheet
          that asks for a reason before it commits — the reason is what makes
          the audit row worth having.
        */}
{outcome === undefined ? null : <OutcomeNotice outcome={outcome} t={t} />}

        <ActionRow>
          <Action icon="shield" href={sectionHref(locale, 'vendors')}>
            {t('admin.action.verify')}
          </Action>
          <Action icon="money" href={sectionHref(locale, 'money')}>
            {t('admin.vendor.payOut')}
          </Action>
          {v.status === 'suspended' ? (
            <Action intent="primary" icon="check" href={here('?act=activate')}>
              {t('admin.vendor.reactivate')}
            </Action>
          ) : (
            <Action intent="danger" icon="ban" href={here('?act=suspend')}>
              {t('admin.vendor.suspend')}
            </Action>
          )}
        </ActionRow>

        {act === 'suspend' || act === 'activate' ? (
          <ActionPanel
            title={
              act === 'suspend' ? t('admin.vendor.suspend') : t('admin.vendor.reactivate')
            }
            /*
             * Suspending the operator is not suspending the person who owns
             * it. The summary says so, because an admin who means one and does
             * the other finds out from a phone call.
             */
            summary={
              act === 'suspend'
                ? t('admin.vendor.suspendSummary', { name: v.displayName })
                : t('admin.vendor.reactivateSummary', { name: v.displayName })
            }
            action={setVendorStatus}
            hidden={{ locale, vendorId: id, returnTo: `vendors/${id}` }}
            confirm={
              act === 'suspend'
                ? { value: 'suspended', label: t('admin.vendor.suspend'), icon: 'ban' }
                : { value: 'active', label: t('admin.vendor.reactivate'), icon: 'check' }
            }
            intent={act === 'suspend' ? 'danger' : 'primary'}
            reasonLabel={t('admin.act.reasonLabel')}
            reasonHint={t('admin.vendor.statusReasonHint')}
            closeHref={here()}
            closeLabel={t('admin.review.close')}
          />
        ) : null}

        <StatRow>
          <Stat
            label={t('admin.vendor.departuresToday')}
            value={formatNumber(v.today.departures, context)}
            note={t('admin.today.seats', {
              booked: formatNumber(v.today.seatsBooked, context),
              total: formatNumber(v.today.capacity, context),
            })}
            href={sectionHref(locale, 'bookings')}
          />
          <Stat
            label={t('admin.vendor.services')}
            value={formatNumber(v.services.published, context)}
            note={t('admin.vendor.ofTotal', {
              total: formatNumber(v.services.total, context),
            })}
            href={sectionHref(locale, 'catalog')}
          />
          <Stat
            label={t('admin.vendor.incidents')}
            value={formatNumber(v.openIncidents, context)}
            href={sectionHref(locale, 'trust')}
            {...(v.openIncidents > 0 ? { tone: 'danger' as const } : {})}
          />
          <Stat
            label={t('admin.vendor.staff')}
            value={formatNumber(v.staff.length, context)}
            {...(staffExpiring > 0
              ? {
                  tone: 'warning' as const,
                  note: t('admin.vendor.staffExpiring', { count: staffExpiring }),
                }
              : {})}
          />
          <Stat
            label={t('admin.vendor.rating')}
            // No reviews reads as an em dash, never as a zero: an operator
            // nobody has rated is not an operator rated nought.
            value={
              v.ratingHundredths === null
                ? '—'
                : formatNumber(v.ratingHundredths / RATING_SCALE, context, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })
            }
            note={t('admin.vendor.reviews', { count: v.reviews })}
            href={sectionHref(locale, 'trust')}
          />
          <Stat
            label={t('admin.vendor.owed')}
            value={formatCurrency(money(v.payout.dueMinor, v.payout.currency), context)}
            href={sectionHref(locale, 'money')}
            wide
          />
        </StatRow>

        <Panel
          title={t('admin.vendor.papers')}
          figure={formatNumber(v.documents.length, context)}
          flush
        >
          {/*
            A date alone does not say "soon". "Expires 22 September" reads the
            same in June as it does the day before, so every paper carries the
            time it has left as a bar as well as a figure.
          */}
          {v.documents.map((row) => {
            const band = bandFor(row.expiresOn, now);
            const days =
              row.expiresOn === null
                ? null
                : Math.round(
                    (new Date(`${row.expiresOn}T00:00:00Z`).getTime() - now.getTime()) / DAY_MS,
                  );
            const tone: MeterTone =
              band === 'expired' ? 'danger' : band === 'within30' ? 'warning' : 'success';
            const label = t(`admin.docType.${row.type}`);
            const value =
              days === null
                ? t('admin.vendor.noExpiry')
                : days < 0
                  ? t('admin.vendor.expiredDays', { count: Math.abs(days) })
                  : t('admin.vendor.daysLeft', { count: days });

            return (
              <Meter
                key={row.id}
                label={label}
                value={value}
                fraction={days === null ? 1 : days / HORIZON_DAYS}
                tone={tone}
                valueText={`${label}: ${value}`}
              />
            );
          })}
        </Panel>

        <Panel title={t('admin.vendor.team')} figure={formatNumber(v.staff.length, context)} flush>
          <RecordList
            columns={staffColumns}
            rows={v.staff}
            rowKey={(row) => row.id}
            caption={t('admin.vendor.team')}
            empty={
              <p className="font-console text-cBody text-c-muted">{t('admin.vendor.noStaff')}</p>
            }
          />
        </Panel>

        <Panel title={t('admin.vendor.record')} flush>
          <KeyValueList>
            <KeyValue
              label={t('admin.vendor.legalName')}
              value={v.legalName ?? t('admin.vendor.noLegalName')}
            />
            {/*
              The person behind the centre, one tap from their own page. An
              owner made from the roster has no password yet, and the note
              says so rather than letting somebody hand over a login that
              does not exist.
            */}
            <KeyValue
              label={t('admin.onboard.owner')}
              value={ownerLabel === null ? t('admin.people.unnamed') : isolate(ownerLabel)}
              note={
                v.owner.canSignIn
                  ? t('admin.onboard.ownerCanSignIn')
                  : t('admin.onboard.ownerCannotSignIn')
              }
              href={path(locale, `people/${v.owner.userId}`)}
            />
            <KeyValue
              label={t('admin.vendor.joined')}
              value={formatDate(new Date(v.joined), context, 'monthYear')}
            />
            <KeyValue
              label={t('admin.vendor.owed')}
              value={formatCurrency(money(v.payout.dueMinor, v.payout.currency), context)}
              {...(v.payout.periodEnd === null
                ? {}
                : {
                    note: t('admin.vendor.payoutPeriod', {
                      date: formatDate(new Date(v.payout.periodEnd), context, 'date'),
                    }),
                  })}
              strong
              href={sectionHref(locale, 'money')}
            />
          </KeyValueList>
        </Panel>

        {/* Documents as a table too, because the meters above deliberately
            drop the issuer and the certificate number to stay readable. */}
        <Panel title={t('admin.vendor.paperDetail')} flush>
          <RecordList
            columns={documentColumns}
            rows={v.documents}
            rowKey={(row) => row.id}
            caption={t('admin.vendor.paperDetail')}
            empty={
              <p className="font-console text-cBody text-c-muted">{t('admin.vendor.noPapers')}</p>
            }
          />
        </Panel>
      </Stack>
    </ConsolePage>
  );
}

function DocumentPill({
  row,
  now,
  t,
}: {
  row: Document;
  now: Date;
  t: ReturnType<typeof translator>;
}) {
  const band = bandFor(row.expiresOn, now);
  if (band === 'expired') {
    return (
      <Pill tone="danger" icon={row.blocksPublishing ? 'ban' : 'alert'}>
        {t(row.blocksPublishing ? 'admin.expiry.blocks' : 'admin.expiry.expired')}
      </Pill>
    );
  }
  if (row.status === 'rejected') {
    return (
      <Pill tone="danger" icon="close">
        {t('admin.verifyStatus.rejected')}
      </Pill>
    );
  }
  if (row.status === 'verified') {
    return (
      <Pill tone="success" icon="shield">
        {t('admin.verifyStatus.verified')}
      </Pill>
    );
  }
  return (
    <Pill tone="warning" icon="clock">
      {t(`admin.verifyStatus.${row.status}`)}
    </Pill>
  );
}

// The vendor detail route is dynamic: an operator's state is exactly the kind
// of thing that must never be served from a build-time snapshot.
export const dynamic = 'force-dynamic';
