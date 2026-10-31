import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"

const { auth } = NextAuth(authConfig)

// Public API routes that do NOT require authentication
const PUBLIC_API_ROUTES = [
  "/api/health",
  "/api/contact",
  "/api/booking-request",
  "/api/notification-signup",
  "/api/chat",
  "/api/events",
  "/api/group-requests",
  "/api/auth",
  "/api/webhooks",
  "/api/subscribers",
  "/api/newsletter-signup",
  "/api/content-review", // own auth: engine bearer secret, or Deke's per-week link token
]

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  )
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Protect /dashboard/* routes
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Protect /api/* routes (except public ones)
  if (pathname.startsWith("/api/") && !isPublicApiRoute(pathname)) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}
