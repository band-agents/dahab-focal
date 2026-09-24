import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LOCALES, directionOf, isLocale } from '@dahab/i18n/server';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Dahab Focal · Partner',
  description: 'Run your dive centre, boat or tour on Dahab Focal.',
};

/**
 * Every locale is a real route, so the text direction is a fact of the
 * document rather than something toggled at runtime. This root layout owns
 * <html> because <html dir> cannot be decided above the locale segment.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={directionOf(locale)}>
      <body className="font-console antialiased">{children}</body>
    </html>
  );
}
