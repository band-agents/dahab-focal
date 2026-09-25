import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LOCALES, directionOf, isLocale } from '@dahab/i18n/server';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Sky Eye · Dahab Focal',
  description: 'The Dahab Focal platform console.',
};

/**
 * Every locale is a real route, so direction is a document-level fact rather
 * than a runtime toggle — the console reloads into it, the way the traveler
 * app's direction change is a transaction rather than a re-render.
 *
 * This is the root layout: it owns <html> because <html dir> is the one thing
 * that cannot be decided above the locale segment.
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
      {/*
        `font-console`, not `font-ui`. This is the console, and its face is
        IBM Plex Sans — Rubik belongs to the traveller app. Arabic swaps to
        Plex Sans Arabic through the `[lang]` rule in globals.css rather than
        a class here, because the swap is a property of the document's
        language and not of this element.
      */}
      <body className="font-console antialiased">{children}</body>
    </html>
  );
}
