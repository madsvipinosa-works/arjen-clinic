import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BreadcrumbTrail Component
 * Renders an ergonomic, accessible clinical navigation trail.
 *
 * @param {Object} props
 * @param {Array<{ label: string, href?: string, isCurrent?: boolean }>} props.items
 * @param {string} [props.className]
 */
export function BreadcrumbTrail({ items = [], className }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center text-xs font-semibold text-gray-500 py-1.5 px-3 rounded-xl bg-white/70 backdrop-blur-md border border-gray-200/70 shadow-2xs w-fit",
        className
      )}
    >
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Root Home / Admin */}
        <li className="flex items-center">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-gray-400 hover:text-rose-600 transition-colors"
            title="Admin Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-bold">Admin</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;

          return (
            <React.Fragment key={index}>
              <li className="flex items-center text-gray-300">
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </li>
              <li className="flex items-center">
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-black text-gray-800 tracking-tight max-w-[200px] truncate"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-rose-600 transition-colors font-medium max-w-[150px] truncate"
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-500">{item.label}</span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
