'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * A link that knows whether it is where you are.
 *
 * The frame is drawn by a layout, and a layout cannot see the current path —
 * so without this the tab bar would never show which tab you are on, and on a
 * phone that highlight is most of how somebody knows where they are. This is
 * the one piece of the chrome that runs in the browser, and it only reads the
 * path.
 *
 * Home is active only on itself; any other section is active on itself and
 * everything beneath it, so "Stories" stays lit while posting a new one.
 */
export function ActiveLink({
  href,
  exact = false,
  className,
  activeClassName,
  inactiveClassName,
  children,
}: {
  readonly href: Route;
  readonly exact?: boolean;
  readonly className: string;
  readonly activeClassName: string;
  readonly inactiveClassName: string;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
    </Link>
  );
}
