import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getOrCreateUserAccount, logStoreDiagnostics } from "@/lib/sources/userStreams";

const adminLogin = String(process.env.ADMIN_GITHUB_LOGIN || "").trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  // auth() runs on every page (root layout + proxy), so a missing secret
  // used to crash the whole app locally even though sign-in is optional.
  // Outside production, fall back to a fixed dev-only secret; production
  // still requires a real AUTH_SECRET and fails loudly without one.
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? undefined : "local-dev-only-auth-secret"),
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    // Any GitHub account may sign in now - isAdmin (below) is the separate,
    // narrower gate that still restricts /admin to the one approved login.
    async signIn({ profile }) {
      return Boolean(profile?.login);
    },
    async jwt({ token, profile }) {
      const login = String(profile?.login || token.githubLogin || "").trim().toLowerCase();
      token.githubLogin = login;
      token.isAdmin = Boolean(adminLogin && login === adminLogin);
      // Only re-check subscription status on real sign-in (profile is only
      // present then) - avoids a DB round-trip on every token refresh.
      if (profile && login) {
        try {
          const account = await getOrCreateUserAccount(login);
          token.subscribed = Boolean(account?.subscribed);
          // No login in the log line - just what the lookup found.
          console.log("[auth] account lookup:", account ? `found, subscribed=${Boolean(account.subscribed)}` : "no store (Turso not configured)");
          await logStoreDiagnostics("sign-in", { force: true });
        } catch (error) {
          // Never log the raw error here - driver errors can echo back
          // query args, and this table only ever holds a login + a flag,
          // but keep the same discipline everywhere as a hard rule.
          console.error("[auth] Failed to resolve user account:", error.message || "unknown error");
          token.subscribed = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.githubLogin = token.githubLogin || null;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.subscribed = Boolean(token.subscribed);
      }
      return session;
    }
  },
  pages: {
    signIn: "/admin/sign-in"
  }
});

