import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import { Icon, Panel } from '@/components/console';
import { MORE_KEYS, SECTIONS, hrefFor } from '@/lib/nav';
import { translator } from '@/lib/i18n';
import Link from 'next/link';

/**
 * The sections the tab bar could not carry.
 *
 * A real screen rather than a slide-out drawer. A drawer hides the shape of
 * the product behind a gesture, and this console has nine sections a new
 * admin has to be able to see at once; above `lg` the rail shows all of them
 * anyway, so a drawer would also have meant two different answers to "what is
 * in this console" depending on the width of the window.
 *
 * Nothing on this screen fetches. It is a map, and a map that can fail to load
 * is worse than no map.
 */
export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);

  const rest = MORE_KEYS.map((key) => SECTIONS.find((section) => section.key === key)).filter(
    (section): section is (typeof SECTIONS)[number] => section !== undefined,
  );

  return (
    <ConsolePage
      locale={locale}
      current="more"
      title={t('admin.nav.more')}
      subtitle={t('admin.more.subtitle')}
    >
      <Stack>
        <Panel flush>
          <ul>
            {rest.map((section) => (
              <li key={section.key} className="border-b border-c-edge last:border-b-0">
                <Link
                  href={hrefFor(locale, section)}
                  className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-c-sm bg-c-raised text-c-muted">
                    <Icon name={section.icon} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-console text-cLabel text-c-text">
                      {t(section.labelKey)}
                    </span>
                    <span className="block font-console text-cMeta text-c-muted">
                      {t(`admin.more.${section.key}`)}
                    </span>
                  </span>
                  <Icon name="chevronEnd" size={16} className="shrink-0 text-c-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </Stack>
    </ConsolePage>
  );
}
