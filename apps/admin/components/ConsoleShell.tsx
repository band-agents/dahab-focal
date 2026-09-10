import { isLocale, type Locale } from '@dahab/i18n/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Shell } from '@/components/Shell';
import { BUILT, SECTIONS, hrefFor } from '@/lib/nav';
import { translator, type Translate } from '@/lib/i18n';

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

export function ConsolePage({
  locale,
  current,
  title,
  subtitle,
  children,
  headerEnd,
}: ConsolePageProps) {
  const t: Translate = translator(locale);

  const nav = SECTIONS.map((section) => ({
    key: section.key,
    label: t(section.labelKey),
    mark: section.mark,
    href: hrefFor(locale, section),
    current: section.key === current,
    pending: !BUILT.has(section.key),
  }));

  return (
    <Shell
      nav={nav}
      consoleName={t('admin.console')}
      consoleSub={t('admin.consoleSub')}
      title={title}
      subtitle={subtitle}
      headerEnd={headerEnd}
    >
      {children}
    </Shell>
  );
}
