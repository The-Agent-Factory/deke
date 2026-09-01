"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Menu, ArrowRight, LogIn } from "lucide-react";

const navItems = [
  { label: "Arrangements", href: "/arrangements" },
  { label: "Coaching", href: "/coaching" },
  { label: "Workshops", href: "/workshops" },
  { label: "Speaking", href: "/speaking" },
  { label: "Media", href: "/media" },
  { label: "Events", href: "/events" },
  { label: "Find a Group", href: "/find-group" },
  { label: "About", href: "/about" },
];

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Landing pages with their own chrome (e.g. Total Vocal) hide the global header.
  if (pathname?.startsWith("/total-vocal")) {
    return null;
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 lg:h-18 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Deke Sharon
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={item.href}
                    className="group inline-flex h-9 items-center justify-center px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground focus:text-foreground focus:outline-none link-underline"
                  >
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className="text-foreground/40 hover:text-foreground/70 transition-colors p-2"
            title="Admin Login"
          >
            <LogIn className="h-4 w-4" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/booking">
              Book a Consultation
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px]">
            <div className="flex flex-col gap-8 py-6">
              {/* Mobile Logo */}
              <div className="flex items-center">
                <Link
                  href="/"
                  className="flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="font-heading text-xl font-semibold">
                    Deke Sharon
                  </span>
                </Link>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center text-base font-semibold text-foreground/80 hover:text-foreground transition-colors py-3 px-2 rounded-md hover:bg-muted"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile CTAs */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button variant="outline" asChild className="w-full justify-center">
                  <Link href="/contact" onClick={() => setIsOpen(false)}>
                    Contact
                  </Link>
                </Button>
                <Button asChild className="w-full justify-center">
                  <Link href="/booking" onClick={() => setIsOpen(false)}>
                    Book a Consultation
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Tagline + Admin */}
              <div className="mt-auto pt-8 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  The Father of Contemporary A Cappella
                </p>
                <Link
                  href="/login"
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
                  onClick={() => setIsOpen(false)}
                  title="Admin Login"
                >
                  <LogIn className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
