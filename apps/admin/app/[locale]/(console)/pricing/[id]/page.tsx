import { notFound } from 'next/navigation';
import type { Route } from 'next';

import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  isolate,
  money,
  type Locale,
  type Money,
} from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import {
  Action,
  ActionRow,
  Banner,
  FIELD,
  Icon,
  KeyValue,
  KeyValueList,
  Panel,
  Pill,
  RecordList,
  type RecordColumn,
  type Tone,
} from '@/components/console';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator, type Translate } from '@/lib/i18n';
import { path, sectionHref } from '@/lib/nav';

/**
 * One service's rate card, read whole.
 *
 * Three questions, top to bottom: how is this priced (the model and its
 * tiers), what changes the price (every rule, in the order it applies, in
 * words rather than jsonb), and what would a particular party actually pay.
 *
 * The last one is worked out by the API with `computePrice()` — the function
 * checkout calls — so the figure here is not the console's arithmetic. The
 * party is a plain GET form: no JavaScript, and a price check can be linked
 * to and sent to somebody.
 */

type Card = Awaited<ReturnType<typeof api.admin.servicePricing.query>>;
type Rule = Card['rules'][number];
type Line = Extract<Card['quote'], { ok: true }>['breakdown']['lines'][number];

const PARTY_KINDS = ['adult', 'child', 'student', 'resident', 'infant', 'instructor'] as const;
type PartyKind = (typeof PARTY_KINDS)[number];

/** 2024-01-01 was a Monday: ISO weekday n is this date plus n − 1 days. */
const A_MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

export default async function ServicePricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Partial<Record<PartyKind | 'on', string>>>;
}) {
  const { locale: raw, id } = await params;
  const query = await searchParams;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;
  const now = new Date();

  // Only a submitted form carries a party; an untouched page asks for the
  // API's default of two adults rather than a party of nobody.
  const asked = PARTY_KINDS.some((kind) => query[kind] !== undefined);
  const party = asked
    ? Object.fromEntries(PARTY_KINDS.map((kind) => [kind, headcount(query[kind])]))
    : undefined;
  const tripDate =
    query.on !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(query.on) ? query.on : undefined;

  const card = await load(() =>
    api.admin.servicePricing.query({
      serviceId: id,
      locale,
      ...(party === undefined ? {} : { party }),
      ...(tripDate === undefined ? {} : { tripDate }),
    }),
  );

  const back = { href: sectionHref(locale, 'pricing'), label: t('admin.action.back') };

  if (!card.ok) {
    if (card.problem.kind === 'notFound') notFound();
    return (
      <ConsolePage locale={locale} current="pricing" title={t('admin.pricing.title')} back={back}>
        <DataProblemNotice problem={card.problem} t={t} title={t('admin.pricing.title')} />
      </ConsolePage>
    );
  }

  const { service, models, rules, quote } = card.data;
  const model = models[0];
  const broken = rules.filter((rule) => rule.condition === null || rule.adjustment === null);
  const here: Route = path(locale, `pricing/${id}`);

  const ruleColumns: readonly RecordColumn<Rule>[] = [
    {
      key: 'rule',
      role: 'primary',
      header: t('admin.pricing.colRule'),
      cell: (rule) => labelFor(rule.labelKey, t),
    },
    {
      key: 'when',
      role: 'secondary',
      header: t('admin.pricing.colWhen'),
      cell: (rule) =>
        rule.condition === null
          ? t('admin.pricing.brokenCondition')
          : describeCondition(rule.condition, t, locale),
    },
    {
      key: 'change',
      role: 'secondary',
      header: t('admin.pricing.colChange'),
      cell: (rule) =>
        rule.adjustment === null
          ? t('admin.pricing.brokenAdjustment')
          : describeAdjustment(rule.adjustment, t, locale),
      width: '11rem',
    },
    {
      key: 'order',
      role: 'column',
      header: t('admin.pricing.colOrder'),
      numeric: true,
      cell: (rule) => formatNumber(rule.priority, context),
      width: '6rem',
    },
    {
      key: 'stacks',
      role: 'column',
      header: t('admin.pricing.colStacks'),
      cell: (rule) =>
        rule.stackable
          ? t('admin.pricing.stacksYes')
          : rule.exclusionGroup === null
            ? t('admin.pricing.stacksNo')
            : t('admin.pricing.stacksNoGroup', { group: isolate(rule.exclusionGroup) }),
      width: '9rem',
    },
    {
      key: 'status',
      role: 'end',
      header: t('admin.col.status'),
      width: '10rem',
      cell: (rule) => <RuleStatus rule={rule} now={now} t={t} locale={locale} />,
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="pricing"
      title={service.title ?? t('admin.pricing.untitled')}
      subtitle={[
        // A Latin operator name inside an Arabic line reorders without this.
        isolate(service.vendorName),
        t(service.categoryNameKey),
        t(`admin.serviceStatus.${service.status}`),
      ].join(' · ')}
      back={back}
    >
      <Stack>
        {model === undefined ? (
          <Banner
            tone="danger"
            icon="ban"
            title={t('admin.pricing.noModelTitle')}
            detail={t('admin.pricing.noModelDetail')}
          />
        ) : null}
        {models.length > 1 ? (
          <Banner
            tone="warning"
            icon="alert"
            title={t('admin.pricing.twoModelsHere')}
            detail={t('admin.pricing.twoModelsDetail')}
          />
        ) : null}
        {broken.length === 0 ? null : (
          <Banner
            tone="danger"
            icon="alert"
            title={t('admin.pricing.brokenBanner', { count: broken.length })}
            detail={t('admin.pricing.brokenDetail')}
          />
        )}

        <ActionRow>
          <Action icon="operators" href={path(locale, `vendors/${service.vendorId}`)}>
            {t('admin.pricing.openOperator')}
          </Action>
        </ActionRow>

        {model === undefined ? null : (
          <Panel title={t('admin.pricing.model')} flush>
            <KeyValueList>
              <KeyValue
                label={t('admin.pricing.colModel')}
                value={t(`admin.pricing.kind.${model.kind}`)}
                note={t(`admin.pricing.kindHint.${model.kind}`)}
              />
              <KeyValue
                label={t('admin.pricing.colBase')}
                value={
                  model.kind === 'free'
                    ? t('admin.pricing.kind.free')
                    : formatCurrency(model.basePrice, context)
                }
                strong
              />
              {model.maxGroupSize === null ? null : (
                <KeyValue
                  label={t('admin.pricing.maxGroup')}
                  value={formatNumber(model.maxGroupSize, context)}
                />
              )}
              <KeyValue
                label={t('admin.pricing.partySize')}
                value={
                  service.maxParticipants === null
                    ? t('admin.pricing.partyFrom', {
                        min: formatNumber(service.minParticipants, context),
                      })
                    : t('admin.pricing.partyRange', {
                        min: formatNumber(service.minParticipants, context),
                        max: formatNumber(service.maxParticipants, context),
                      })
                }
              />
            </KeyValueList>
          </Panel>
        )}

        {model === undefined || (model.tiers.length === 0 && model.kind !== 'perPersonTiered') ? null : (
          <Panel title={t('admin.pricing.tiers')} figure={formatNumber(model.tiers.length, context)} flush>
            {model.tiers.length === 0 ? (
              <p className="px-4 py-4 text-cBody text-c-muted">{t('admin.pricing.noTiers')}</p>
            ) : (
              <KeyValueList>
                {model.tiers.map((tier) => (
                  <KeyValue
                    key={tier.id}
                    label={t('admin.pricing.tierFrom', { count: tier.minPartySize })}
                    value={formatCurrency(tier.unitPrice, context)}
                  />
                ))}
              </KeyValueList>
            )}
          </Panel>
        )}

        <Panel title={t('admin.pricing.rules')} figure={formatNumber(rules.length, context)} flush>
          <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.pricing.rulesSub')}</p>
          <RecordList
            columns={ruleColumns}
            rows={rules}
            rowKey={(rule) => rule.id}
            caption={t('admin.pricing.rules')}
            empty={<p className="font-console text-cBody text-c-muted">{t('admin.pricing.noRules')}</p>}
          />
        </Panel>

        <Panel title={t('admin.pricing.check')}>
          <div className="flex flex-col gap-4">
            <p className="text-cMeta text-c-muted">{t('admin.pricing.checkSub')}</p>

            {/* GET, to this same page: the party is in the URL, so a price
                check can be reloaded, bookmarked or sent to somebody. */}
            <form method="get" action={here} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PARTY_KINDS.map((kind) => (
                  <label key={kind} className="flex flex-col gap-1.5">
                    <span className="font-console text-cLabel text-c-text">{t(`participant.${kind}`)}</span>
                    <input
                      type="number"
                      name={kind}
                      min={0}
                      max={99}
                      inputMode="numeric"
                      defaultValue={quote.party[kind]}
                      className={`${FIELD} tabular-nums`}
                    />
                  </label>
                ))}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="font-console text-cLabel text-c-text">{t('admin.pricing.checkDate')}</span>
                <input
                  type="date"
                  name="on"
                  required
                  defaultValue={quote.tripDate}
                  dir="ltr"
                  className={FIELD}
                />
              </label>
              <div>
                <Action type="submit" intent="primary" icon="refresh">
                  {t('admin.pricing.checkRun')}
                </Action>
              </div>
            </form>

            {quote.ok ? (
              <>
                <KeyValueList>
                  {quote.breakdown.lines.map((line, index) => (
                    <KeyValue
                      key={`${line.labelKey}-${index}`}
                      label={lineLabel(line, quote.party, t, locale, model?.basePrice)}
                      value={formatCurrency(line.amount, context)}
                      {...(line.kind === 'rule'
                        ? { note: t('admin.pricing.checkRuleNote') }
                        : {})}
                    />
                  ))}
                  <KeyValue
                    label={t('admin.pricing.checkTotal')}
                    note={t('admin.pricing.checkAssumption', {
                      date: formatDate(new Date(`${quote.tripDate}T10:00:00Z`), context, 'weekdayDate'),
                    })}
                    value={formatCurrency(quote.breakdown.total, context)}
                    strong
                  />
                  <KeyValue
                    label={t('admin.pricing.checkPaying')}
                    value={formatNumber(quote.breakdown.chargeableParty, context)}
                  />
                  <KeyValue
                    label={t('admin.pricing.checkSeats')}
                    value={formatNumber(quote.breakdown.capacityParty, context)}
                    {...(quote.breakdown.capacityParty > quote.breakdown.chargeableParty
                      ? { note: t('admin.pricing.checkNotCharged') }
                      : {})}
                  />
                </KeyValueList>
                {outside(quote.breakdown.capacityParty, service) ? (
                  <Banner
                    tone="warning"
                    icon="alert"
                    title={t('admin.pricing.checkOutside')}
                    detail={
                      service.maxParticipants === null
                        ? t('admin.pricing.partyFrom', {
                            min: formatNumber(service.minParticipants, context),
                          })
                        : t('admin.pricing.partyRange', {
                            min: formatNumber(service.minParticipants, context),
                            max: formatNumber(service.maxParticipants, context),
                          })
                    }
                  />
                ) : null}
                <p className="flex items-start gap-2 text-cMeta text-c-muted">
                  <Icon name="exchange" size={14} className="mt-0.5 shrink-0" />
                  <span>{t('admin.pricing.noFx')}</span>
                </p>
              </>
            ) : (
              <Banner
                tone={quote.reason === 'emptyParty' ? 'info' : 'danger'}
                icon={quote.reason === 'emptyParty' ? 'people' : 'ban'}
                title={t(`admin.pricing.refusal.${quote.reason}`)}
              />
            )}
          </div>
        </Panel>
      </Stack>
    </ConsolePage>
  );
}

/** A form field as a headcount: blank or nonsense is nobody, never NaN. */
function headcount(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 99) : 0;
}

function outside(
  seats: number,
  service: { minParticipants: number; maxParticipants: number | null },
): boolean {
  return (
    seats < service.minParticipants ||
    (service.maxParticipants !== null && seats > service.maxParticipants)
  );
}

/**
 * A rule's label is an i18n key an operator's rule carries. One the
 * catalogue does not know must not reach the screen as `priceRule.x`.
 */
function labelFor(key: string, t: Translate): string {
  const label = t(key);
  return label === key ? t('admin.pricing.unlabelledRule') : label;
}

function list(items: readonly string[], locale: Locale): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
}

function weekday(iso: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(A_MONDAY + (iso - 1) * DAY_MS),
  );
}

function describeCondition(
  condition: NonNullable<Rule['condition']>,
  t: Translate,
  locale: Locale,
): string {
  const context = { locale } as const;
  switch (condition.kind) {
    case 'always':
      return t('admin.pricing.cond.always');
    case 'seasonal':
      return t('admin.pricing.cond.seasonal', {
        start: formatDate(new Date(`${condition.startDate}T10:00:00Z`), context, 'date'),
        end: formatDate(new Date(`${condition.endDate}T10:00:00Z`), context, 'date'),
      });
    case 'dayOfWeek':
      return t('admin.pricing.cond.dayOfWeek', {
        days: list(condition.weekdays.map((day) => weekday(day, locale)), locale),
      });
    case 'earlyBird':
      return t('admin.pricing.cond.earlyBird', { count: condition.minDaysAhead });
    case 'lastMinute':
      return t('admin.pricing.cond.lastMinute', { count: condition.withinHours });
    case 'participantKind':
      return t('admin.pricing.cond.participantKind', {
        kinds: list(
          condition.participants.map((kind) => t(`participant.${kind}`)),
          locale,
        ),
      });
    case 'groupSize':
      return t('admin.pricing.cond.groupSize', { count: condition.minPartySize });
    case 'currency':
      return t('admin.pricing.cond.currency', { currency: isolate(condition.currency) });
  }
}

function describeAdjustment(
  adjustment: NonNullable<Rule['adjustment']>,
  t: Translate,
  locale: Locale,
): string {
  const context = { locale } as const;
  switch (adjustment.kind) {
    case 'percentage':
      return adjustment.rate < 0
        ? t('admin.pricing.adj.percentOff', { percent: formatPercent(-adjustment.rate, context) })
        : t('admin.pricing.adj.percentExtra', { percent: formatPercent(adjustment.rate, context) });
    case 'fixed':
      return adjustment.delta.amount < 0
        ? t('admin.pricing.adj.amountOff', {
            amount: formatCurrency(
              money(-adjustment.delta.amount, adjustment.delta.currency),
              context,
            ),
          })
        : t('admin.pricing.adj.amountExtra', {
            amount: formatCurrency(adjustment.delta, context),
          });
    case 'override':
      return t('admin.pricing.adj.override', {
        amount: formatCurrency(adjustment.price, context),
      });
  }
}

/** A breakdown line in words: "Adults × 2", "Child rate", "per group". */
function lineLabel(
  line: Line,
  party: Record<PartyKind, number>,
  t: Translate,
  locale: Locale,
  basePrice: Money | undefined,
): string {
  const context = { locale } as const;
  if (line.kind === 'rule') return labelFor(line.labelKey, t);
  const kind = line.labelKey.startsWith('participant.')
    ? (line.labelKey.slice('participant.'.length) as PartyKind)
    : null;
  if (kind !== null && PARTY_KINDS.includes(kind)) {
    return t('admin.pricing.checkLine', {
      kind: t(line.labelKey),
      heads: formatNumber(party[kind], context),
    });
  }
  // `price.perGroup` and friends carry the base price as their argument.
  return basePrice === undefined
    ? t(line.labelKey)
    : t(line.labelKey, { price: formatCurrency(basePrice, context) });
}

function RuleStatus({
  rule,
  now,
  t,
  locale,
}: {
  rule: Rule;
  now: Date;
  t: Translate;
  locale: Locale;
}) {
  const context = { locale } as const;
  const status: { tone: Tone; icon: 'check' | 'ban' | 'clock' | 'alert'; label: string } =
    rule.condition === null || rule.adjustment === null
      ? { tone: 'danger', icon: 'alert', label: t('admin.pricing.ruleBroken') }
      : !rule.isActive
        ? { tone: 'neutral', icon: 'ban', label: t('admin.pricing.ruleOff') }
        : rule.activeFrom !== null && new Date(rule.activeFrom) > now
          ? {
              tone: 'info',
              icon: 'clock',
              label: t('admin.pricing.ruleStarts', {
                date: formatDate(new Date(rule.activeFrom), context, 'dateShort'),
              }),
            }
          : rule.activeUntil !== null && new Date(rule.activeUntil) < now
            ? {
                tone: 'neutral',
                icon: 'clock',
                label: t('admin.pricing.ruleEnded', {
                  date: formatDate(new Date(rule.activeUntil), context, 'dateShort'),
                }),
              }
            : { tone: 'success', icon: 'check', label: t('admin.pricing.ruleOn') };

  return (
    <Pill tone={status.tone} icon={status.icon}>
      {status.label}
    </Pill>
  );
}

export const dynamic = 'force-dynamic';
