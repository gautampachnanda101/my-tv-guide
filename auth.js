import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getOrCreateUserAccount } from "@/lib/sources/userStreams";

const adminLogin = String(process.env.ADMIN_GITHUB_LOGIN || "").trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
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

