/**
 * The console's core component, and the reason the old DataTable is gone.
 *
 * A data table is a desktop shape. The old one wrapped itself in
 * `overflow-x-auto` and let a phone scroll sideways through eight columns,
 * which is the same as having no phone design at all — and roughly everyone
 * who runs a dive centre in Dahab is holding a phone.
 *
 * So one definition renders two things. Each column declares a `role`:
 *
 *   primary    the headline on a phone, and a column in the table
 *   secondary  the quiet second line on a phone, and a column
 *   end        the trailing pill or figure on a phone, and a column
 *   column     table only — real detail that a phone row cannot carry
 *
 * The phone row is not a squashed table row, and the table is not a stretched
 * list. Nothing is defined twice, and no column can be silently dropped from
 * both, because `role` has no default that means "nowhere".
 *
 * `href` is the other half of the point. Every record in this console leads
 * somewhere — an operator to its own page, a document to its review, a ledger
 * entry to the entry that reverses it. A list whose rows go nowhere is the
 * thing the console was accused of being, so the link is part of the
 * primitive rather than something each screen remembers to add.
 */
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { Icon } from './Icon';

export type ColumnRole = 'primary' | 'secondary' | 'end' | 'column';

export interface RecordColumn<Row> {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell: (row: Row) => ReactNode;
  readonly role: ColumnRole;
  /** End-aligned and tabular, and not mirrored by direction. */
  readonly numeric?: boolean;
  readonly width?: string;
}

export interface RecordListProps<Row> {
  readonly columns: readonly RecordColumn<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  /** Where this record lives. Omit only for a genuinely terminal row. */
  readonly href?: (row: Row) => Route;
  /** Named for screen readers; the visible heading is the Panel's. */
  readonly caption: string;
  /** Shown in place of the rows when there are none. Never an empty table. */
  readonly empty?: ReactNode;
}

export function RecordList<Row>({
  columns,
  rows,
  rowKey,
  href,
  caption,
  empty,
}: RecordListProps<Row>) {
  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center">{empty}</div>;
  }

  const primary = columns.find((column) => column.role === 'primary');
  const secondary = columns.filter((column) => column.role === 'secondary');
  const end = columns.filter((column) => column.role === 'end');

  return (
    <>
      {/* ── Phone: a list of records ─────────────────────────────────── */}
      <ul className="md:hidden">
        {rows.map((row) => {
          const target = href?.(row);
          const head = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-console text-cLabel text-c-text">
                  {primary?.cell(row)}
                </span>
                {secondary.map((column) => (
                  <span
                    key={column.key}
                    className="mt-0.5 block truncate font-console text-cMeta text-c-muted"
                  >
                    {column.cell(row)}
                  </span>
                ))}
              </span>
              {end.length === 0 ? null : (
                <span className="flex shrink-0 items-center gap-2">
                  {end.map((column) => (
                    <span
                      key={column.key}
                      className={
                        column.numeric === true
                          ? 'font-figure text-cFigureSm tabular-nums text-c-text'
                          : ''
                      }
                    >
                      {column.cell(row)}
                    </span>
                  ))}
                </span>
              )}
              {target === undefined ? null : (
                <Icon name="chevronEnd" size={16} className="shrink-0 text-c-muted" />
              )}
            </>
          );

          return (
            <li key={rowKey(row)} className="border-b border-c-edge last:border-b-0">
              {target === undefined ? (
                <span className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3">{head}</span>
              ) : (
                <Link
                  href={target}
                  className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus"
                >
                  {head}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Desktop: the real table ──────────────────────────────────── */}
      <table className="hidden w-full border-collapse text-start md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-c-edge">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width === undefined ? undefined : { width: column.width }}
                className={`px-4 pb-2 pt-3 font-console text-cOverline uppercase tracking-[0.09em] text-c-muted ${
                  column.numeric === true ? 'text-end' : 'text-start'
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const target = href?.(row);
            return (
              <tr
                key={rowKey(row)}
                className="relative border-b border-c-edge transition-colors last:border-b-0 focus-within:bg-c-raised hover:bg-c-raised"
              >
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-middle font-console text-cBody text-c-text ${
                      column.numeric === true
                        ? 'text-end font-figure text-cFigureSm tabular-nums'
                        : 'text-start'
                    }`}
                  >
                    {/*
                      The whole row is the link, drawn as a stretched overlay
                      from the first cell. A table row cannot be an anchor, and
                      a link per cell would read the operator's name eight
                      times to a screen reader.
                    */}
                    {index === 0 && target !== undefined ? (
                      <Link
                        href={target}
                        className="before:absolute before:inset-0 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus"
                      >
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
