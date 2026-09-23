import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const adminLogin = String(process.env.ADMIN_GITHUB_LOGIN || "").trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const login = String(profile?.login || "").trim().toLowerCase();
      return Boolean(adminLogin && login && login === adminLogin);
    },
    async jwt({ token, profile }) {
      const login = String(profile?.login || token.githubLogin || "").trim().toLowerCase();
      token.githubLogin = login;
      token.isAdmin = Boolean(adminLogin && login === adminLogin);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.githubLogin = token.githubLogin || null;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    }
  },
  pages: {
    signIn: "/admin/sign-in"
  }
});
