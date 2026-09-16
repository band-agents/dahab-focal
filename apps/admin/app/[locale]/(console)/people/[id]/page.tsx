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
  Panel,
  Pill,
  RecordList,
  type ActionField,
  type RecordColumn,
} from '@/components/console';
import { OutcomeNotice } from '@/components/ReviewPanel';
import {
  changeRole,
  endUserSessions,
  setUserSuspended,
  updateUser,
} from '@/lib/actions';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import type { Route } from 'next';

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
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  /** `act` opens a panel; `outcome` reports what the last one did. */
  searchParams: Promise<{ act?: string; role?: string; vendor?: string; outcome?: string }>;
}) {
  const { locale: raw, id } = await params;
  const { act, role: actRole, vendor: actVendor, outcome } = await searchParams;
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
  const { team, vendors } = result.data;

  /** This page, with a panel open or closed. Every action link goes through it. */
  const here = (query = ''): Route => path(locale, `people/${id}${query}`);
  const shared = { locale, userId: id, returnTo: `people/${id}` };
  const reasonLabel = t('admin.act.reasonLabel');
  const reasonHint = t('admin.act.reasonHint');
  const closeLabel = t('admin.review.close');

  /** The operators this account is scoped to, for the role panel's select. */
  const vendorOptions = vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }));

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

  type TeamMember = Person['team'][number];
  const teamColumns: readonly RecordColumn<TeamMember>[] = [
    {
      key: 'name',
      header: t('admin.col.person'),
      role: 'primary',
      cell: (row) =>
        row.displayName ?? (row.email === null ? t('admin.people.unnamed') : isolate(row.email)),
    },
    {
      key: 'where',
      header: t('admin.col.role'),
      role: 'secondary',
      cell: (row) => `${t(`role.${row.role}`)} · ${row.vendorName}`,
    },
    {
      key: 'state',
      header: t('admin.col.status'),
      role: 'end',
      width: '11rem',
      cell: (row) =>
        row.suspended ? (
          <Pill tone="danger" icon="ban">
            {t('admin.people.suspended')}
          </Pill>
        ) : (
          <Pill tone="success" icon="check">
            {t('admin.people.clear')}
          </Pill>
        ),
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

        {outcome === undefined ? null : <OutcomeNotice outcome={outcome} t={t} />}

        {/*
          The actions on this account, on this account's own page. Each opens a
          panel below rather than firing on a tap: every one requires a reason,
          and a suspend that happened from a single press is a suspend nobody
          can explain afterwards.
        */}
        <ActionRow>
          <Action icon="doc" href={here('?act=edit')}>
            {t('admin.act.edit')}
          </Action>
          <Action icon="key" href={here('?act=grant')}>
            {t('admin.act.grantRole')}
          </Action>
          {activeSessions === 0 ? null : (
            <Action icon="ban" href={here('?act=sessions')}>
              {t('admin.person.endSessions', { count: activeSessions })}
            </Action>
          )}
          {person.suspended ? (
            <Action intent="primary" icon="check" href={here('?act=restore')}>
              {t('admin.act.restore')}
            </Action>
          ) : (
            <Action intent="danger" icon="ban" href={here('?act=suspend')}>
              {t('admin.act.suspend')}
            </Action>
          )}
        </ActionRow>

        {act === 'edit' ? (
          <ActionPanel
            title={t('admin.act.edit')}
            summary={t('admin.act.editSummary')}
            action={updateUser}
            hidden={shared}
            fields={
              [
                {
                  name: 'displayName',
                  label: t('admin.act.field.name'),
                  type: 'text',
                  value: person.displayName ?? '',
                },
                {
                  name: 'countryCode',
                  label: t('admin.act.field.country'),
                  type: 'text',
                  value: person.countryCode ?? '',
                  hint: t('admin.act.field.countryHint'),
                  ltr: true,
                },
              ] satisfies ActionField[]
            }
            confirm={{ value: 'save', label: t('admin.act.save'), icon: 'check' }}
            reasonLabel={reasonLabel}
            reasonHint={reasonHint}
            closeHref={here()}
            closeLabel={closeLabel}
          />
        ) : null}

        {act === 'grant' || act === 'revoke' ? (
          <ActionPanel
            title={act === 'revoke' ? t('admin.act.revokeRole') : t('admin.act.grantRole')}
            summary={act === 'revoke' ? t('admin.act.revokeSummary') : t('admin.act.grantSummary')}
            action={changeRole}
            hidden={{
              ...shared,
              ...(actRole === undefined ? {} : { role: actRole }),
              ...(actVendor === undefined ? {} : { vendorId: actVendor }),
            }}
            fields={
              actRole !== undefined
                ? []
                : ([
                    {
                      name: 'role',
                      label: t('admin.act.field.role'),
                      type: 'select',
                      required: true,
                      options: [
                        { value: 'traveler', label: t('role.traveler') },
                        { value: 'vendorStaff', label: t('role.vendorStaff') },
                        { value: 'vendorOwner', label: t('role.vendorOwner') },
                        { value: 'admin', label: t('role.admin') },
                      ],
                    },
                    /*
                     * Only the operators this account is already scoped to.
                     * Attaching somebody to a centre they have no connection
                     * with is an act that belongs on the operator's own page,
                     * beside the team it is changing.
                     */
                    ...(vendorOptions.length === 0
                      ? []
                      : [
                          {
                            name: 'vendorId',
                            label: t('admin.act.field.operator'),
                            type: 'select' as const,
                            options: [
                              { value: '', label: t('admin.act.field.noOperator') },
                              ...vendorOptions,
                            ],
                          },
                        ]),
                  ] satisfies ActionField[])
            }
            confirm={
              act === 'revoke'
                ? { value: 'revoke', label: t('admin.act.revokeRole'), icon: 'ban' }
                : { value: 'grant', label: t('admin.act.grantRole'), icon: 'key' }
            }
            intent={act === 'revoke' ? 'danger' : 'primary'}
            reasonLabel={reasonLabel}
            reasonHint={t('admin.act.roleReasonHint')}
            closeHref={here()}
            closeLabel={closeLabel}
          />
        ) : null}

        {act === 'sessions' ? (
          <ActionPanel
            title={t('admin.person.endSessions', { count: activeSessions })}
            summary={t('admin.act.sessionsSummary', { count: activeSessions })}
            action={endUserSessions}
            hidden={shared}
            confirm={{ value: 'end', label: t('admin.act.endNow'), icon: 'ban' }}
            intent="danger"
            reasonLabel={reasonLabel}
            reasonHint={reasonHint}
            closeHref={here()}
            closeLabel={closeLabel}
          />
        ) : null}

        {act === 'suspend' || act === 'restore' ? (
          <ActionPanel
            title={act === 'suspend' ? t('admin.act.suspend') : t('admin.act.restore')}
            summary={
              act === 'suspend' ? t('admin.act.suspendSummary') : t('admin.act.restoreSummary')
            }
            action={setUserSuspended}
            hidden={shared}
            confirm={
              act === 'suspend'
                ? { value: 'suspend', label: t('admin.act.suspend'), icon: 'ban' }
                : { value: 'restore', label: t('admin.act.restore'), icon: 'check' }
            }
            intent={act === 'suspend' ? 'danger' : 'primary'}
            reasonLabel={reasonLabel}
            reasonHint={reasonHint}
            closeHref={here()}
            closeLabel={closeLabel}
          />
        ) : null}

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

        {/*
          The accounts under this one.
          .
          Not a second hierarchy: these are the other accounts holding a role
          scoped to an operator this account is scoped to, which is the same
          fact the permission check reads. A centre owner sees their guides
          here; a traveller has nobody and the panel does not render.
        */}
        {vendors.length === 0 ? null : (
          <Panel
            title={t('admin.person.team')}
            figure={formatNumber(team.length, context)}
            flush
          >
            <RecordList
              columns={teamColumns}
              rows={team}
              rowKey={(row) => `${row.id}:${row.vendorId}:${row.role}`}
              href={(row) => path(locale, `people/${row.id}`)}
              caption={t('admin.person.team')}
              empty={
                <p className="font-console text-cBody text-c-muted">{t('admin.person.noTeam')}</p>
              }
            />
          </Panel>
        )}

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
