"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ActiveLinkProps = Omit<React.ComponentProps<typeof Link>, "href" | "className" | "aria-current"> & {
  href: string;
  className?: string;
  exact?: boolean;
};

export function ActiveLink({ href, children, className, exact = false, ...props }: ActiveLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const classes = [className, isActive ? "active" : ""].filter(Boolean).join(" ");

  return (
    <Link {...props} href={href} className={classes || undefined} aria-current={isActive ? "page" : undefined}>
      {children}
    </Link>
  );
}
