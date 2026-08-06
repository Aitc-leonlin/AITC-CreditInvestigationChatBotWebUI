"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  LucideIcon,
  PanelLeft,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { flattenMembershipMenus, useMembershipMenus } from "@/hooks/useMembershipMenus";
import { type MembershipMenu } from "@/services/api/membershipMenuApi";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { cn } from "@/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  Building2,
  ChevronDown,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
};

const INCOMPLETE_MENU_CODES = new Set(["MEMBERSHIP_ORGS", "MEMBERSHIP_NOTIFICATIONS"]);
function menuHref(menu: MembershipMenu) {
  return menu.routePath || "/membership/dashboard";
}

function menuTitle(menu: MembershipMenu) {
  if (!INCOMPLETE_MENU_CODES.has(menu.code) || menu.title.includes("(尚未完成)")) {
    return menu.title;
  }
  return `${menu.title}(尚未完成)`;
}

function isMenuActive(menu: MembershipMenu, pathname: string): boolean {
  const href = menuHref(menu);
  return (
    pathname === href ||
    (href !== "/membership" && pathname.startsWith(`${href}/`)) ||
    menu.children.some((child) => isMenuActive(child, pathname))
  );
}

function MenuAccordionItem({ menu, depth = 0 }: { menu: MembershipMenu; depth?: number }) {
  const pathname = usePathname();
  const Icon = ICONS[menu.icon] ?? ShieldCheck;
  const hasChildren = menu.children.length > 0;
  const href = menu.routePath || "/membership/dashboard";
  const isActive = isMenuActive(menu, pathname);
  const isDirectActive = pathname === href || (href !== "/membership" && pathname.startsWith(`${href}/`));
  const [isOpen, setIsOpen] = useState(() => isActive || depth === 0);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (!hasChildren) {
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          depth > 0 && "ml-4",
          isDirectActive
            ? "bg-indigo-600 text-white"
            : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words leading-tight">{menuTitle(menu)}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className={cn(
          "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
          depth > 0 && "ml-4 w-[calc(100%-1rem)]",
          isActive
            ? "bg-indigo-50 text-indigo-800"
            : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 break-words leading-tight">{menuTitle(menu)}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      {isOpen ? (
        <div className="mt-1 grid gap-1">
          {menu.children.map((child) => (
            <MenuAccordionItem key={child.id} menu={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function MembershipAdminLayout({ children }: { children: ReactNode }) {
  const { menus, isLoading } = useMembershipMenus();
  const visibleMenus = flattenMembershipMenus(menus).filter((menu) => menu.routePath);
  const firstRoute = visibleMenus[0]?.routePath ?? "/membership/dashboard";

  return (
    <MembershipSessionGuard>
      <div className="grid h-full min-h-0 bg-[#f8fcff] md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-slate-200 bg-white md:flex md:flex-col">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-xs font-semibold uppercase text-indigo-600">Membership Admin</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">管理後台</div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500">載入選單中</div>
            ) : menus.length > 0 ? (
              <div className="grid gap-1">
                {menus.map((menu) => (
                  <MenuAccordionItem key={menu.id} menu={menu} />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                目前帳號沒有可用的管理選單。
              </div>
            )}
          </nav>
          {/* <div className="border-t border-slate-200 p-3">
            <Link
              href={firstRoute}
              className="flex items-center justify-center rounded-md border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              回到可用功能
            </Link>
          </div> */}
        </aside>
        <section className="min-h-0 overflow-hidden">{children}</section>
      </div>
    </MembershipSessionGuard>
  );
}
