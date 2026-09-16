import { formatDate, formatNumber, isolate } from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import type { Route } from 'next';

import {
  Action,
  ActionPanel,
  ActionRow,
  Panel,
  Pill,
  RecordList,
  Stat,
  StatRow,
  type ActionField,
  type RecordColumn,
} from '@/components/console';
import { OutcomeNotice } from '@/components/ReviewPanel';
import { createUser } from '@/lib/actions';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { path } from '@/lib/nav';

/**
 * A09 · People.
 *
 * The platform had eight screens and not one of them was about a traveller.
 * `users`, `user_profiles`, `certifications`, `medical_info` and
 * `emergency_contacts` were all seeded and none was ever read; `user.readAny`
 * sat unused in the permission matrix from the first commit. An operator could
 * be suspended and a booking refunded, but the person those things happened to
 * had no page — so a support question as ordinary as "this diver says their
 * card was verified, was it?" had no answer anywhere in the console.
 *
 * Guests are excluded. A guest row is an unclaimed cart with no name and no
 * contact details; listing them buries the people somebody is looking for.
 */

type Person = Awaited<ReturnType<typeof api.admin.people.query>>[number];

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ act?: string; outcome?: string }>;
}) {
  const { locale: raw } = await params;
  const { act, outcome } = await searchParams;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [people, roster] = await Promise.all([
    load(() => api.admin.people.query()),
    // The operators, so a new guide can be scoped to one as they are created.
    load(() => api.admin.vendors.query()),
  ]);
  const here = (query = ''): Route => path(locale, `people${query}`);

  const rows = people.ok ? people.data : [];
  const clearance = rows.filter((row) => row.clearanceOutstanding).length;
  const pendingCards = rows.reduce((total, row) => total + row.certificationsPending, 0);
  const suspended = rows.filter((row) => row.suspended).length;

  const columns: readonly RecordColumn<Person>[] = [
    {
      key: 'name',
      header: t('admin.col.person'),
      role: 'primary',
      // A name if there is one, otherwise the address they sign in with.
      // Most rows have no profile yet, and a roster of twenty-six identical
      // "No name on file" lines identifies nobody — the address does.
      cell: (row) => {
        const contact = row.email ?? row.phone;
        if (row.displayName !== null) return row.displayName;
        // An address is Latin inside an Arabic sentence; without isolation
        // the bidi algorithm moves its parts to the wrong end of the line and
        // a support agent reads back a wrong address.
        return contact === null ? t('admin.people.unnamed') : isolate(contact);
      },
    },
    {
      key: 'who',
      header: t('admin.col.role'),
      role: 'secondary',
      // What this account is. Staff and admins are rows in `users` too, and
      // a roster that shows them without saying so reads as a list of
      // travellers with strange addresses.
      cell: (row) => {
        const roles = row.roles.filter((role) => role !== 'guest');
        const named = roles.length === 0 ? [t('role.traveler')] : roles.map((r) => t(`role.${r}`));
        const contact = row.displayName === null ? null : (row.email ?? row.phone);
        return contact === null
          ? named.join(' · ')
          : `${named.join(' · ')} · ${isolate(contact)}`;
      },
    },
    {
      key: 'country',
      header: t('admin.col.country'),
      role: 'column',
      cell: (row) => row.countryCode ?? '—',
      width: '7rem',
    },
    {
      key: 'joined',
      header: t('admin.col.joined'),
      role: 'column',
      cell: (row) => formatDate(new Date(row.joined), context, 'monthYear'),
      width: '11rem',
    },
    {
      key: 'bookings',
      header: t('admin.col.bookings'),
      role: 'column',
      numeric: true,
      cell: (row) => formatNumber(row.bookings, context),
      width: '8rem',
    },
    {
      key: 'flag',
      header: t('admin.col.status'),
      role: 'end',
      width: '15rem',
      // One pill, and the order is the order somebody needs to know things:
      // a suspended account first, then the medical clearance that stops
      // someone diving on the day, then an unchecked card.
      cell: (row) =>
        row.suspended ? (
          <Pill tone="danger" icon="ban">
            {t('admin.people.suspended')}
          </Pill>
        ) : row.clearanceOutstanding ? (
          <Pill tone="danger" icon="alert">
            {t('admin.people.clearance')}
          </Pill>
        ) : row.certificationsPending > 0 ? (
          <Pill tone="warning" icon="doc">
            {t('admin.people.cardsPending', { count: row.certificationsPending })}
          </Pill>
        ) : (
          <Pill tone="success" icon="check">
            {t('admin.people.clear')}
          </Pill>
        ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="people"
      title={t('admin.nav.people')}
      subtitle={t('admin.people.subtitle')}
    >
      <Stack>
        {outcome === undefined ? null : <OutcomeNotice outcome={outcome} t={t} />}

        <ActionRow>
          <Action intent="primary" icon="plus" href={here('?act=new')}>
            {t('admin.act.addAccount')}
          </Action>
        </ActionRow>

        {act !== 'new' ? null : (
          <ActionPanel
            title={t('admin.act.addAccount')}
            summary={t('admin.act.addSummary')}
            action={createUser}
            hidden={{ locale }}
            fields={
              [
                {
                  name: 'displayName',
                  label: t('admin.act.field.name'),
                  type: 'text',
                },
                {
                  name: 'email',
                  label: t('admin.act.field.email'),
                  type: 'email',
                  hint: t('admin.act.field.contactHint'),
                  ltr: true,
                },
                { name: 'phone', label: t('admin.act.field.phone'), type: 'tel', ltr: true },
                {
                  name: 'countryCode',
                  label: t('admin.act.field.country'),
                  type: 'text',
                  hint: t('admin.act.field.countryHint'),
                  ltr: true,
                },
                {
                  name: 'role',
                  label: t('admin.act.field.role'),
                  type: 'select',
                  options: [
                    { value: '', label: t('admin.act.field.noRole') },
                    { value: 'traveler', label: t('role.traveler') },
                    { value: 'vendorStaff', label: t('role.vendorStaff') },
                    { value: 'vendorOwner', label: t('role.vendorOwner') },
                    { value: 'admin', label: t('role.admin') },
                  ],
                },
                {
                  name: 'vendorId',
                  label: t('admin.act.field.operator'),
                  type: 'select',
                  hint: t('admin.act.field.operatorHint'),
                  options: [
                    { value: '', label: t('admin.act.field.noOperator') },
                    ...(roster.ok
                      ? roster.data.map((vendor) => ({
                          value: vendor.id,
                          label: vendor.displayName,
                        }))
                      : []),
                  ],
                },
              ] satisfies ActionField[]
            }
            confirm={{ value: 'create', label: t('admin.act.create'), icon: 'plus' }}
            reasonLabel={t('admin.act.reasonLabel')}
            reasonHint={t('admin.act.createReasonHint')}
            closeHref={here()}
            closeLabel={t('admin.review.close')}
          />
        )}

        {!people.ok ? (
          <DataProblemNotice problem={people.problem} t={t} title={t('admin.nav.people')} />
        ) : (
          <>
            <StatRow>
              <Stat
                label={t('admin.people.total')}
                value={formatNumber(rows.length, context)}
              />
              <Stat
                label={t('admin.people.clearanceShort')}
                value={formatNumber(clearance, context)}
                {...(clearance > 0 ? { tone: 'danger' as const } : {})}
              />
              <Stat
                label={t('admin.people.cardsShort')}
                value={formatNumber(pendingCards, context)}
                {...(pendingCards > 0 ? { tone: 'warning' as const } : {})}
              />
              <Stat
                label={t('admin.people.suspendedShort')}
                value={formatNumber(suspended, context)}
                {...(suspended > 0 ? { tone: 'warning' as const } : {})}
              />
            </StatRow>

            <Panel
              title={t('admin.people.roster')}
              figure={formatNumber(rows.length, context)}
              flush
            >
              <RecordList
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                href={(row) => path(locale, `people/${row.id}`)}
                caption={t('admin.people.roster')}
                empty={
                  <p className="font-console text-cBody text-c-muted">{t('admin.people.none')}</p>
                }
              />
            </Panel>
          </>
        )}
      </Stack>
    </ConsolePage>
  );
}

export const dynamic = 'force-dynamic';
