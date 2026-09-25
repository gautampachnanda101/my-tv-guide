import "./globals.css";
import { auth, signIn, signOut } from "@/auth";

export const metadata = {
  title: "My TV Guide",
  description: "Your cinematic command center for live TV, channels, and streaming"
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <div className="account-badge">
          {session?.user ? (
            <>
              <span className="account-badge-name">
                {session.user.githubLogin}
                {session.user.isAdmin ? " \u00b7 Admin" : session.user.subscribed ? " \u00b7 Subscribed" : ""}
              </span>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button type="submit" className="account-badge-action">Sign out</button>
              </form>
            </>
          ) : (
            <form action={async () => { "use server"; await signIn("github"); }}>
              <button type="submit" className="account-badge-action">Sign in</button>
            </form>
          )}
        </div>
        {children}
      </body>
    </html>
  );
}