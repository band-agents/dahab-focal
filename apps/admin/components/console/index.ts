/**
 * The console component set.
 *
 * Deliberately here rather than in `@dahab/ui-web`. These components link, so
 * they need `next/link`, and `@dahab/ui-web` has no Next dependency and should
 * not grow one for a library exactly one app consumes. The operator app's
 * equivalents live in `apps/vendor` for the mirror-image reason — a React
 * Native screen cannot import a web component either way.
 *
 * What the two surfaces DO share is `packages/tokens`: the `c-*` colours, the
 * console type roles and the console radii. That is the layer where "they must
 * not drift apart" is actually enforceable.
 *
 * Separate from the traveller primitives in `@dahab/ui-web` on purpose. The
 * traveller app is cream, blush and the one-hand marks; the console is `c-*`
 * and a single stroke. Importing across that line is how the consoles ended up
 * looking like a booking app with tables in it.
 */
export { Icon } from './Icon';
export type { IconProps } from './Icon';
export { ICONS, ICON_NAMES } from './icons';
export type { IconName, IconShape } from './icons';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps, Crumb } from './PageHeader';

export { Panel, Overline } from './Panel';
export type { PanelProps } from './Panel';

export { RecordList } from './RecordList';
export type { RecordColumn, RecordListProps, ColumnRole } from './RecordList';

export { Pill } from './Pill';
export type { PillProps, Tone } from './Pill';

export { Stat, StatRow } from './Stat';
export type { StatProps } from './Stat';

export { Meter } from './Meter';
export type { MeterProps, MeterTone } from './Meter';

export { Action, ActionRow } from './Action';
export type { ActionProps, Intent } from './Action';

export { KeyValue, KeyValueList } from './KeyValue';
export type { KeyValueProps } from './KeyValue';

export { Banner } from './Banner';
export type { BannerProps } from './Banner';

export { ActionPanel, FIELD } from './ActionPanel';
export type { ActionPanelProps, ActionField, ActionChoice } from './ActionPanel';
