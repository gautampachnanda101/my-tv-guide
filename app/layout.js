import "./globals.css";

export const metadata = {
  title: "My TV Guide",
  description: "Find watchable listings based on the services you already have"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}