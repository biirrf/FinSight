"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import SearchCommand from "./SearchCommand"
import { NAV_ITEMS } from "@/lib/constants"

const MobileNav = ({ initialStocks }: { initialStocks: StockWithWatchlistStatus[] }) => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-600 bg-gray-800 text-gray-300 transition-colors hover:text-yellow-500"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="fixed top-[70px] left-0 z-50 w-full max-w-full translate-x-0 translate-y-0 rounded-none border-x-0 border-b border-gray-700 bg-gray-800 p-0 text-gray-300 data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top"
      >
        <DialogTitle className="sr-only">Main navigation</DialogTitle>
        <nav className="p-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              if (href === "/search") {
                return (
                  <li key="mobile-search" className="rounded-md px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">
                    <SearchCommand renderAs="text" label="Search" initialStocks={initialStocks} />
                  </li>
                )
              }

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? "bg-gray-700 text-yellow-500"
                        : "text-gray-300 hover:bg-gray-700 hover:text-yellow-500"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

export default MobileNav
