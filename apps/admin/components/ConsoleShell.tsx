import { isLocale, isolate, type Locale } from '@dahab/i18n/server';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { signOut } from '@/app/[locale]/sign-in/actions';
import { Action, Frame, type NavItem } from '@/components/console';
import { SECTIONS, TAB_KEYS, hrefFor } from '@/lib/nav';
import { translator, type Translate } from '@/lib/i18n';
import { viewer } from '@/lib/viewer';

/**
 * Every screen mounts the same frame, so the navigation is defined once and a
 * page passes in only what is its own: which section it belongs to, its title,
 * and — on a detail page — where "back" goes.
 */
export function resolveLocale(locale: string): Locale {
  if (!isLocale(locale)) notFound();
  return locale;
}

export interface ConsolePageProps {
  readonly locale: Locale;
  readonly current: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly headerEnd?: ReactNode;
  /**
   * Set on every detail page. A phone has no rail to orient from and the
   * browser's own back button is not visible in a standalone web app, so a
   * detail screen without this is a dead end.
   */
  readonly back?: { readonly href: Route; readonly label: string };
  /**
   * Counts the tab bar and rail should interrupt for — documents waiting,
   * papers expiring. Keyed by section.
   */
  readonly badges?: Readonly<Record<string, number>>;
}

export async function ConsolePage({
  locale,
  current,
  title,
  subtitle,
  children,
  headerEnd,
  back,
  badges,
}: ConsolePageProps) {
  const t: Translate = translator(locale);
  const who = await viewer();

  const nav: readonly NavItem[] = SECTIONS.map((section) => {
    const badge = badges?.[section.key];
    return {
      key: section.key,
      label: t(section.labelKey),
      icon: section.icon,
      href: hrefFor(locale, section),
      current: section.key === current,
      ...(badge === undefined || badge === 0 ? {} : { badge }),
    };
  });

  const email = who.ok ? who.viewer.email : null;

  const railEnd = (
    <div className="flex flex-col gap-2">
      {email === null ? null : (
        <p className="px-2 font-console text-cMeta text-c-muted">
          {/* An address is Latin inside an Arabic sentence; without isolation
              the bidi algorithm moves its parts to the wrong end of the line. */}
          {t('admin.signedInAs', { email: isolate(email) })}
        </p>
      )}
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <Action type="submit" intent="quiet" icon="ban" block>
          {t('admin.signOut')}
        </Action>
      </form>
    </div>
  );

  return (
    <Frame
      nav={nav}
      tabKeys={TAB_KEYS}
      consoleName={t('admin.console')}
      title={title}
      {...(subtitle === undefined ? {} : { subtitle })}
      {...(back === undefined ? {} : { back })}
      {...(headerEnd === undefined ? {} : { headerEnd })}
      railEnd={railEnd}
    >
      {children}
    </Frame>
  );
}

/** The vertical rhythm every console screen uses between its blocks. */
export function Stack({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
