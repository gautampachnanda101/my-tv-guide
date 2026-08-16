import "./globals.css";

export const metadata = {
  title: "My TV Guide",
  description: "Your cinematic command center for live TV, channels, and streaming"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}