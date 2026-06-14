"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckSquare, CreditCard, Home, MoreHorizontal, X } from "lucide-react";
import { signOutAction, switchProfileAction } from "@/lib/actions";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/chores", label: "Chores", icon: CheckSquare },
  { href: "/approvals", label: "Approvals", icon: Bell },
  { href: "/earnings", label: "Allowance", icon: CreditCard }
];

const moreLinks = [
  { href: "/children", label: "Family Members" },
  { href: "/reports", label: "Reports" },
  { href: "/notifications", label: "Household Notes" },
  { href: "/account", label: "Account" }
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMoreOpen(false);
  }

  const isMoreActive = moreLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  return (
    <>
      {moreOpen ? (
        <div className="mobile-more-overlay" role="presentation" onClick={() => setMoreOpen(false)}>
          <div className="mobile-more-sheet" role="dialog" aria-label="More menu" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-more-head">
              <h2>More</h2>
              <button className="ghost-button" type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="More navigation">
              {moreLinks.map((link) => (
                <Link className="mobile-more-link" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <form action={switchProfileAction}>
              <button className="mobile-more-link" type="submit">
                Switch profile
              </button>
            </form>
            <form action={signOutAction}>
              <button className="mobile-more-link" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
      <nav className="mobile-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              className={`mobile-nav-item${isActive ? " active" : ""}`}
              href={item.href}
              key={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          className={`mobile-nav-item${isMoreActive ? " active" : ""}`}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <MoreHorizontal size={22} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
