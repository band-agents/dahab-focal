/**
 * The data table — the console's core component.
 *
 * Rows 52px comfortable / 40px compact, hairline between, hover on the raised
 * surface. Numeric columns stay end-aligned even in RTL, because a column of
 * figures reads down its decimal point in every language; everything else
 * follows the text direction.
 *
 * Row hover and selected states are drawn here provisionally — the design
 * system has never specified them, and they are flagged as a proposal rather
 * than adopted silently.
 */
import type { ReactNode } from 'react';

export interface Column<Row> {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell: (row: Row) => ReactNode;
  /** Figures: end-aligned and tabular, and not mirrored by direction. */
  readonly numeric?: boolean;
  readonly width?: string;
}

export interface DataTableProps<Row> {
  readonly columns: readonly Column<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  readonly density?: 'comfortable' | 'compact';
  /** Rendered in place of the body when there is nothing to show. */
  readonly empty?: ReactNode;
  readonly caption?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  density = 'comfortable',
  empty,
  caption,
}: DataTableProps<Row>) {
  // Row height comes from the spacing scale rather than a fixed pixel height,
  // so a row grows correctly when Arabic body type takes its +20% line-height.
  const rowPadding = density === 'compact' ? 'py-2' : 'py-4';

  if (rows.length === 0 && empty !== undefined) {
    return <div className="px-6 py-12">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      {/* min-w-max lets the wrapper scroll rather than squashing columns: a
          narrow window should not turn "Public liability insurance" into two
          words per line. */}
      <table className="w-full min-w-max border-collapse text-start">
        {caption === undefined ? null : <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width === undefined ? undefined : { width: column.width }}
                className={`px-4 pb-2 pt-1 font-ui text-small font-medium text-text-muted ${
                  column.numeric === true ? 'text-end' : 'text-start'
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-raised"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 ${rowPadding} align-middle font-ui text-body text-text ${
                    column.numeric === true ? 'text-end font-display tabular-nums' : 'text-start'
                  }`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
