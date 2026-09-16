import { notFound } from 'next/navigation';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import {
  Action,
  ActionRow,
  Banner,
  KeyValue,
  KeyValueList,
  Panel,
  Pill,
  RecordList,
  type RecordColumn,
} from '@/components/console';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { path, sectionHref } from '@/lib/nav';

/**
 * One traveller's account.
 *
 * Built around the questions support actually receives, in the order they
 * arrive: is this person blocked from diving, what have they booked, what have
 * they paid, and who can be called if something goes wrong at the Blue Hole.
 *
 * What it deliberately does NOT show is the medical questionnaire itself. The
 * console needs to know that a declaration exists and whether a doctor has
 * cleared it; the specific conditions are the business of the operator running
 * the dive that day, and rendering them on an admin screen would be a
 * disclosure nobody consented to. The API returns a count for the same reason.
 */

type Person = Awaited<ReturnType<typeof api.admin.person.query>>;
type Certification = Person['certifications'][number];
type Booking = Person['bookings'][number];

const CERT_TONE = {
  verified: 'success',
  pending: 'warning',
  inReview: 'info',
  rejected: 'danger',
  expired: 'danger',
} as const;

export default async function PersonPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const result = await load(() => api.admin.person.query({ id }));

  if (!result.ok) {
    if (result.problem.kind === 'notFound') notFound();
    return (
      <ConsolePage
        locale={locale}
        current="people"
        title={t('admin.nav.people')}
        back={{ href: sectionHref(locale, 'people'), label: t('admin.action.back') }}
      >
        <DataProblemNotice problem={result.problem} t={t} title={t('admin.nav.people')} />
      </ConsolePage>
    );
  }

  const { person, certifications, medical, bookings, spend, emergencyContacts, activeSessions } =
    result.data;

  const certColumns: readonly RecordColumn<Certification>[] = [
    {
      key: 'level',
      header: t('admin.col.certification'),
      role: 'primary',
      cell: (row) => `${row.agency} ${row.level}`,
    },
    {
      key: 'number',
      header: t('admin.col.number'),
      role: 'secondary',
      cell: (row) =>
        row.certificateNumber === null
          ? t('admin.person.noCardNumber')
          : isolate(row.certificateNumber),
    },
    {
      key: 'depth',
      header: t('admin.col.maxDepth'),
      role: 'column',
      cell: (row) => (row.maxDepthMetres === null ? '—' : t('admin.person.metres', { depth: row.maxDepthMetres })),
      width: '9rem',
    },
    {
      key: 'status',
      header: t('admin.col.status'),
      role: 'end',
      width: '12rem',
      cell: (row) => (
        <Pill
          tone={CERT_TONE[row.verificationStatus]}
          icon={row.verificationStatus === 'verified' ? 'shield' : 'doc'}
        >
          {t(`admin.verifyStatus.${row.verificationStatus}`)}
        </Pill>
      ),
    },
  ];

  const bookingColumns: readonly RecordColumn<Booking>[] = [
    {
      key: 'service',
      header: t('admin.col.service'),
      role: 'primary',
      cell: (row) => row.serviceTitle,
    },
    {
      key: 'when',
      header: t('admin.col.when'),
      role: 'secondary',
      cell: (row) =>
        `${formatDate(new Date(row.startsAt), context, 'dateTime')} · ${row.vendorName}`,
    },
    {
      key: 'reference',
      header: t('admin.col.reference'),
      role: 'column',
      cell: (row) => isolate(row.reference),
      width: '11rem',
    },
    {
      key: 'total',
      header: t('admin.col.amount'),
      role: 'end',
      numeric: true,
      cell: (row) => formatCurrency(money(row.totalMinor, row.currency), context),
      width: '10rem',
    },
  ];

  const contact = person.email ?? person.phone;

  return (
    <ConsolePage
      locale={locale}
      current="people"
      title={person.displayName ?? t('admin.people.unnamed')}
      subtitle={[
        person.countryCode ?? t('admin.person.noCountry'),
        t('admin.person.joined', {
          date: formatDate(new Date(person.joined), context, 'monthYear'),
        }),
      ].join(' · ')}
      back={{ href: sectionHref(locale, 'people'), label: t('admin.action.back') }}
    >
      <Stack>
        {person.suspended ? (
          <Banner
            tone="danger"
            icon="ban"
            title={t('admin.person.suspendedTitle')}
            detail={t('admin.person.suspendedDetail')}
          />
        ) : null}

        {medical?.requiresPhysicianClearance === true && !medical.hasClearanceOnFile ? (
          <Banner
            tone="danger"
            icon="alert"
            title={t('admin.person.clearanceTitle')}
            detail={t('admin.person.clearanceDetail', { count: medical.declaredCount })}
          />
        ) : null}

        <ActionRow>
          <Action intent="primary" icon="money" href={sectionHref(locale, 'money')}>
            {t('admin.person.refund')}
          </Action>
          <Action icon="ban" href={sectionHref(locale, 'platform')}>
            {t('admin.person.endSessions', { count: activeSessions })}
          </Action>
          <Action intent="danger" icon="ban" href={sectionHref(locale, 'people')}>
            {t('admin.person.suspend')}
          </Action>
        </ActionRow>

        <Panel title={t('admin.person.account')} flush>
          <KeyValueList>
            <KeyValue
              label={t('admin.person.contact')}
              value={contact === null ? t('admin.people.noContact') : isolate(contact)}
            />
            <KeyValue
              label={t('admin.person.readsIn')}
              value={person.isGuest ? t('admin.person.guest') : (result.data.locale ?? '—')}
            />
            <KeyValue
              label={t('admin.person.paid')}
              value={formatCurrency(money(spend.paidMinor, spend.currency), context)}
              strong
            />
            {spend.refundedMinor === 0 ? null : (
              <KeyValue
                label={t('admin.person.refunded')}
                value={formatCurrency(money(spend.refundedMinor, spend.currency), context)}
                href={sectionHref(locale, 'money')}
              />
            )}
            <KeyValue
              label={t('admin.person.sessions')}
              value={formatNumber(activeSessions, context)}
            />
            <KeyValue
              label={t('admin.person.emergency')}
              // Presence, never the number itself. The contact is read off the
              // manifest at the dock by the operator running the dive, which
              // is where it belongs; an admin needs only to know it is there.
              value={
                emergencyContacts === 0
                  ? t('admin.person.noEmergency')
                  : t('admin.person.emergencyOnFile', { count: emergencyContacts })
              }
            />
          </KeyValueList>
        </Panel>

        <Panel
          title={t('admin.person.certifications')}
          figure={formatNumber(certifications.length, context)}
          flush
        >
          <RecordList
            columns={certColumns}
            rows={certifications}
            rowKey={(row) => row.id}
            caption={t('admin.person.certifications')}
            empty={
              <p className="font-console text-cBody text-c-muted">{t('admin.person.noCards')}</p>
            }
          />
        </Panel>

        <Panel
          title={t('admin.person.bookings')}
          figure={formatNumber(bookings.length, context)}
          flush
        >
          <RecordList
            columns={bookingColumns}
            rows={bookings}
            rowKey={(row) => row.id}
            // Through to the operator, which is the thing an admin can act on.
            // A booking detail page does not exist yet; linking to one that
            // does not would be worse than linking to the operator that does.
            href={(row) => path(locale, `vendors/${row.vendorId}`)}
            caption={t('admin.person.bookings')}
            empty={
              <p className="font-console text-cBody text-c-muted">{t('admin.person.noBookings')}</p>
            }
          />
        </Panel>
      </Stack>
    </ConsolePage>
  );
}

export const dynamic = 'force-dynamic';
