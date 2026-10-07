import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import ThemeRegistry from "@/providers/themeRegistry";
import AuthHydration from "@/providers/AuthHydration";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "Panel de administración",
  description: "Sistema de gestión de tienda, inventario y punto de venta",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawMode = cookieStore.get("theme-mode")?.value;
  const initialMode = rawMode === "light" ? "light" : "dark";

  return (
    <html lang="en">
      <body className={roboto.variable} suppressHydrationWarning>
        <AppRouterCacheProvider>
          <ThemeRegistry initialMode={initialMode}>
            <AuthHydration />
            {children}
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
