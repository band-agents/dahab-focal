import { Illo, Mark, Panel } from '@dahab/ui-web';

import type { DataProblem } from '@/lib/api';
import type { Translate } from '@/lib/i18n';

/**
 * Why a screen has nothing to show.
 *
 * A console that renders an empty table when the API is down is lying:
 * "nothing is expiring" and "we could not ask" are different facts and have to
 * look different. This is the second one, and it names the fix rather than
 * apologising — the detail is the API's own message, which for a missing
 * database already says which commands to run.
 */
export function DataProblemNotice({
  problem,
  t,
  title,
}: {
  readonly problem: DataProblem;
  readonly t: Translate;
  readonly title: string;
}) {
  const mark = problem.kind === 'noDatabase' ? 'offline' : 'sos';

  return (
    <Panel title={title} mark="firstAid">
      <div className="flex items-start gap-5">
        <Illo name="jellyfish" size={72} className="shrink-0" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-body text-text">
            <Mark name={mark} size={20} noFlip />
            {t(`admin.problem.${problem.kind}`)}
          </p>
          <p className="mt-2 max-w-prose font-mono text-small text-text-muted">{problem.detail}</p>
        </div>
      </div>
    </Panel>
  );
}
