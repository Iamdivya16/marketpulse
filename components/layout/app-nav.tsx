"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Since last checked" },
  { href: "/watchlist", label: "Watchlist" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await api.logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#00b386] text-sm font-bold text-white">
              G
            </span>
            <span className="text-[22px] font-semibold tracking-tight text-[#191c27]">
              groww
            </span>
          </Link>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative whitespace-nowrap px-3 py-4 text-sm font-medium text-[#666a7a] transition-colors hover:text-[#191c27]",
                    active && "text-[#191c27]",
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#00b386]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
