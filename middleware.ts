import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Protects every /admin/* route (section 20: "secure admin routes").
 * Login page itself must stay accessible, so it's excluded via the matcher
 * below and via the `pages.signIn` redirect target in auth.ts.
 */
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
