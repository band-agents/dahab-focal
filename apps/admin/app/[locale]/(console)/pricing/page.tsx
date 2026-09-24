import { formatCurrency, formatNumber, isolate } from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import {
  Banner,
  Icon,
  Panel,
  Pill,
  RecordList,
  Stat,
  StatRow,
  type RecordColumn,
  type Tone,
} from '@/components/console';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { path } from '@/lib/nav';

/**
 * Pricing · every rate card on the platform.
 *
 * The console could see a booking's total and never the rule that produced
 * it. This is the other half: for each service, how it is priced — the model,
 * the base price, how many rules sit on top — and one tap to the service's
 * own card, where the rules are spelled out and a price can be worked out
 * the way checkout would.
 *
 * Read-only, and it says so. Changing a price is a write with a reason and an
 * audit row like every other, and it is not built yet.
 */

type Row = Awaited<ReturnType<typeof api.admin.pricing.query>>[number];

const LISTING_TONE: Record<Row['status'], Tone> = {
  draft: 'neutral',
  underReview: 'info',
  published: 'success',
  paused: 'warning',
  archived: 'neutral',
  rejected: 'danger',
};

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const cards = await load(() => api.admin.pricing.query({ locale }));

  const header = {
    locale,
    current: 'pricing',
    title: t('admin.pricing.title'),
    subtitle: t('admin.pricing.subtitle'),
  } as const;

  if (!cards.ok) {
    return (
      <ConsolePage {...header}>
        <DataProblemNotice problem={cards.problem} t={t} title={t('admin.pricing.rateCards')} />
      </ConsolePage>
    );
  }

  const rows = cards.data;
  const unpriced = rows.filter((row) => row.model === null);
  const doubled = rows.filter((row) => row.models > 1);
  const activeRules = rows.reduce((total, row) => total + row.rules.active, 0);

  const columns: readonly RecordColumn<Row>[] = [
    {
      key: 'service',
      role: 'primary',
      header: t('admin.col.service'),
      cell: (row) => row.title ?? t('admin.pricing.untitled'),
    },
    {
      key: 'vendor',
      role: 'secondary',
      header: t('admin.col.vendor'),
      // Operator and model on the phone's second line: the two things that
      // say what the figure on the right means.
      cell: (row) =>
        t('admin.pricing.byline', {
          vendor: isolate(row.vendorName),
          model:
            row.model === null ? t('admin.pricing.noModel') : t(`admin.pricing.kind.${row.model.kind}`),
        }),
      width: '15rem',
    },
    {
      key: 'category',
      role: 'column',
      header: t('admin.pricing.colCategory'),
      cell: (row) => t(row.categoryNameKey),
      width: '11rem',
    },
    {
      key: 'rules',
      role: 'column',
      header: t('admin.pricing.colRules'),
      numeric: true,
      cell: (row) =>
        t('admin.pricing.rulesCount', {
          active: formatNumber(row.rules.active, context),
          total: formatNumber(row.rules.total, context),
        }),
      width: '8rem',
    },
    {
      key: 'listing',
      role: 'column',
      header: t('admin.pricing.colListing'),
      cell: (row) => (
        <Pill tone={LISTING_TONE[row.status]}>{t(`admin.serviceStatus.${row.status}`)}</Pill>
      ),
      width: '10rem',
    },
    {
      key: 'price',
      role: 'end',
      header: t('admin.pricing.colBase'),
      width: '10rem',
      cell: (row) =>
        row.model === null ? (
          <Pill tone="warning" icon="alert">
            {t('admin.pricing.noPrice')}
          </Pill>
        ) : row.model.kind === 'free' ? (
          t('admin.pricing.kind.free')
        ) : (
          <span className="font-figure text-cFigureSm tabular-nums text-c-text">
            {formatCurrency(row.model.basePrice, context)}
          </span>
        ),
    },
  ];

  return (
    <ConsolePage
      {...header}
      headerEnd={
        <span className="flex items-center gap-3 rounded-c-xs bg-c-info-bg ps-4 pe-5 py-2">
          <Icon name="tag" size={20} />
          <span className="font-console text-cHeading text-c-text">
            {formatNumber(rows.length, context)}
          </span>
        </span>
      }
    >
      <Stack>
        {/*
          A service with no model has no price, so a traveller cannot book it
          at all. That is a problem, not a statistic, so it is stated first.
        */}
        {unpriced.length === 0 ? null : (
          <Banner
            tone="warning"
            icon="alert"
            title={t('admin.pricing.unpricedBanner', { count: unpriced.length })}
            detail={t('admin.pricing.unpricedDetail')}
          />
        )}
        {doubled.length === 0 ? null : (
          <Banner
            tone="warning"
            icon="alert"
            title={t('admin.pricing.twoModels', { count: doubled.length })}
            detail={t('admin.pricing.twoModelsDetail')}
          />
        )}

        <StatRow>
          <Stat
            label={t('admin.pricing.priced')}
            value={formatNumber(rows.length - unpriced.length, context)}
            note={t('admin.pricing.ofServices', { total: formatNumber(rows.length, context) })}
          />
          <Stat
            label={t('admin.pricing.unpriced')}
            value={formatNumber(unpriced.length, context)}
            {...(unpriced.length > 0 ? { tone: 'warning' as const } : {})}
          />
          <Stat label={t('admin.pricing.activeRules')} value={formatNumber(activeRules, context)} />
        </StatRow>

        <Panel title={t('admin.pricing.rateCards')} figure={formatNumber(rows.length, context)} flush>
          {/*
            Said once, where the prices are, rather than beside every figure:
            there is no exchange-rate source, so the EUR equivalent CLAUDE.md
            asks for cannot be computed — and a guessed rate on a price is
            worse than none.
          */}
          <p className="flex items-start gap-2 px-4 pb-2 pt-3 text-cMeta text-c-muted">
            <Icon name="exchange" size={14} className="mt-0.5 shrink-0" />
            <span>
              {t('admin.pricing.noFx')} {t('admin.pricing.readOnly')}
            </span>
          </p>
          <RecordList
            columns={columns}
            rows={rows}
            rowKey={(row) => row.serviceId}
            href={(row) => path(locale, `pricing/${row.serviceId}`)}
            caption={t('admin.pricing.rateCards')}
            empty={<p className="font-console text-cBody text-c-muted">{t('admin.pricing.none')}</p>}
          />
        </Panel>
      </Stack>
    </ConsolePage>
  );
}

export const dynamic = 'force-dynamic';
