import { isLocale, isolate, type Locale } from '@dahab/i18n/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button } from '@dahab/ui-web';

import { signOut } from '@/app/[locale]/sign-in/actions';
import { Shell } from '@/components/Shell';
import { BUILT, SECTIONS, hrefFor } from '@/lib/nav';
import { translator, type Translate } from '@/lib/i18n';
import { viewer } from '@/lib/viewer';

/**
 * Every screen mounts the same shell with the same rail, so the nav is defined
 * once and the current section is the only thing a page passes in.
 */
export function resolveLocale(locale: string): Locale {
  if (!isLocale(locale)) notFound();
  return locale;
}

export interface ConsolePageProps {
  readonly locale: Locale;
  readonly current: string;
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly headerEnd?: ReactNode;
}

export async function ConsolePage({
  locale,
  current,
  title,
  subtitle,
  children,
  headerEnd,
}: ConsolePageProps) {
  const t: Translate = translator(locale);
  const who = await viewer();

  const nav = SECTIONS.map((section) => ({
    key: section.key,
    label: t(section.labelKey),
    mark: section.mark,
    href: hrefFor(locale, section),
    current: section.key === current,
    pending: !BUILT.has(section.key),
  }));

  const email = who.ok ? who.viewer.email : null;

  const railEnd = (
    <div className="border-t border-border pt-4">
      {email === null ? null : (
        <p className="px-3 pb-2 text-caption text-text-muted">
          {/* An address is Latin inside an Arabic sentence; without isolation
              the bidi algorithm moves its parts to the wrong end of the line. */}
          {t('admin.signedInAs', { email: isolate(email) })}
        </p>
      )}
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="ghost" mark="offline">
          {t('admin.signOut')}
        </Button>
      </form>
    </div>
  );

  return (
    <Shell
      nav={nav}
      consoleName={t('admin.console')}
      consoleSub={t('admin.consoleSub')}
      title={title}
      subtitle={subtitle}
      headerEnd={headerEnd}
      railEnd={railEnd}
    >
      {children}
    </Shell>
  );
}
