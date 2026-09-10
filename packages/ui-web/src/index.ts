/**
 * @dahab/ui-web — the web component library.
 *
 * Shared by the admin console and any other Next.js surface. Every component
 * reads its values from @dahab/tokens through the generated Tailwind preset,
 * and every symbol comes from the design system's own arrays.
 */
export { Mark, Illo, CategoryMark } from './marks/Mark';
export type { MarkProps, NamedMarkProps, IlloProps, CategoryMarkProps } from './marks/Mark';

export { MARKS, ILLOS, CATEGORY_MARKS } from './marks/data';
export type {
  MarkGlyph,
  MarkName,
  MarkTint,
  IlloName,
  CategoryMarkName,
} from './marks/data';

export { StatusPill } from './primitives/StatusPill';
export type { StatusPillProps, StatusTone } from './primitives/StatusPill';

export { Panel } from './primitives/Panel';
export type { PanelProps } from './primitives/Panel';

export { Button } from './primitives/Button';
export type { ButtonProps, ButtonVariant } from './primitives/Button';

export { DataTable } from './primitives/DataTable';
export type { Column, DataTableProps } from './primitives/DataTable';
