import { Banner } from '@/components/console';
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
 *
 * It is a banner rather than a panel now. On a phone a panel with an
 * illustration in it pushed the rest of the screen below the fold, so a single
 * failing query hid three that had worked.
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
  return (
    <Banner
      tone="danger"
      icon={problem.kind === 'noDatabase' ? 'ban' : 'alert'}
      title={`${title} — ${t(`admin.problem.${problem.kind}`)}`}
      detail={<span className="font-figure">{problem.detail}</span>}
    />
  );
}
