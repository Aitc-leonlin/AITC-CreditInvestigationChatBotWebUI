"use client";

import { cn } from "@/utils/cn";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Link from "next/link";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";

export const ActiveLink = (props: {
  href: string;
  children: ReactNode;
  icon: ReactNode;
}) => {
  const pathname = usePathname();
  const isActive = pathname === props.href;
  return (
    <Link
      href={props.href}
      className={cn(
        "rounded-full border border-[#cfe4f2] bg-white px-4 py-2 text-sm font-medium text-[#12344a] transition-colors duration-200",
        "flex items-center gap-2 whitespace-nowrap",
        !isActive &&
          "hover:border-[#57A6D4] hover:bg-[#eef7fc] hover:text-[#0f3f5d]",
        isActive && "cursor-default border-[#57A6D4] bg-[#57A6D4] text-white",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span>{props.children}</span>
      <span
        className={cn(
          "flex items-center text-[#57A6D4] transition-colors",
          isActive ? "text-white" : "group-hover:text-[#0f3f5d]",
        )}
      >
        {props.icon}
      </span>
    </Link>
  );
};

export function Navbar() {
  return (
    <nav>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#d6e8f4] bg-[#f8fcff] p-1.5">
        <ActiveLink
          href="/"
          icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
        >
          授信AI助理
        </ActiveLink>
        <ActiveLink
          href="/expert_knowledge"
          icon={<PsychologyAltIcon sx={{ fontSize: 18 }} />}
        >
          專家知識庫
        </ActiveLink>
      </div>
    </nav>
  );
}
