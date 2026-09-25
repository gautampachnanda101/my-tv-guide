import { signIn } from "@/auth";

export default function AdminSignInPage() {
  return (
    <main className="page-shell" style={{ maxWidth: 640, margin: "0 auto" }}>
      <section className="panel">
        <p className="eyebrow">Account</p>
        <h1>Sign in</h1>
        <p className="subhead">Sign in with GitHub to access your account (admin tools if approved, or your personal streams if subscribed).</p>
        <form action={async () => { "use server"; await signIn("github", { redirectTo: "/admin" }); }}>
          <button type="submit" className="cta cta-primary">Continue with GitHub</button>
        </form>
      </section>
    </main>
  );
}
