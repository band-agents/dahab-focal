import { isLocale, type Locale } from '@dahab/i18n/server';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { PageHeader, type Crumb } from '@/components/console/PageHeader';
import { SECTIONS, hrefFor, sectionHref } from '@/lib/nav';
import { translator } from '@/lib/i18n';

/**
 * One console screen: its header and its content.
 *
 * The navigation is not here any more — it lives in the (console) layout, so
 * it is drawn once and survives every tap. What a page supplies is only what
 * is its own: its title, and on a detail page, the list it belongs to.
 */
export function resolveLocale(locale: string): Locale {
  if (!isLocale(locale)) notFound();
  return locale;
}

export interface ConsolePageProps {
  readonly locale: Locale;
  /** Which section this screen belongs to — decides the breadcrumb. */
  readonly current: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly headerEnd?: ReactNode;
  /**
   * Set on a detail page: the list it was opened from. Only its `href` is
   * read now — the trail names the section itself, which is more useful than
   * the word "Back".
   */
  readonly back?: { readonly href: Route; readonly label: string };
}

export function ConsolePage({
  locale,
  current,
  title,
  subtitle,
  children,
  headerEnd,
  back,
}: ConsolePageProps) {
  const t = translator(locale);
  const home: Crumb = { label: t('admin.nav.home'), href: sectionHref(locale, 'home') };
  const section = SECTIONS.find((candidate) => candidate.key === current);

  /*
   * Home has nothing above it. A section screen sits under Home. A detail
   * screen sits under its section, which sits under Home. That is the whole
   * hierarchy, and the back button is always the last step of it.
   */
  const crumbs: readonly Crumb[] =
    current === 'home'
      ? []
      : back === undefined || section === undefined
        ? [home]
        : [home, { label: t(section.labelKey), href: back.href ?? hrefFor(locale, section) }];

  return (
    <>
      <PageHeader
        title={title}
        {...(subtitle === undefined ? {} : { subtitle })}
        crumbs={crumbs}
        backLabel={t('admin.action.back')}
        trailLabel={t('admin.nav.trail')}
        {...(headerEnd === undefined ? {} : { end: headerEnd })}
      />
      {/*
        The bottom padding clears the floating tab bar and the home indicator
        beneath it. Without it the last row of every list sits under the bar —
        which is exactly the row somebody scrolled down to reach.
      */}
      <main
        id="main"
        className="mx-auto w-full max-w-[var(--console-content-max)] px-3 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] console-enter lg:px-8 lg:py-6 lg:pb-10"
      >
        {children}
      </main>
    </>
  );
}

/** The vertical rhythm every console screen uses between its blocks. */
export function Stack({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
