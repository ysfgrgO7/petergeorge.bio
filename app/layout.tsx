// app/layout.tsx
import { Poppins } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/app/components/LayoutWrapper";
import AdminProvider from "@/app/components/isAdmin";
import BackgroundMotion from "@/app/components/BackgroundMotion";
import PlaceChecker from "@/app/components/placeChecker"; // 👈 new client component
import ThemeProvider from "@/app/components/ThemeProvider";

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Master Biology",
  description: "Learn Biology",
  icons: {
    icon: "/icon.svg",
  },
};

import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || "";

  return (
    <html lang="en">
      <body className={poppins.className}>
        <AdminProvider nonce={nonce}>
          <ThemeProvider nonce={nonce}>
            <div id="bg-grid"></div>
            <LayoutWrapper>{children}</LayoutWrapper>
            <PlaceChecker />
            <BackgroundMotion /> {/* 👈 add here */}
          </ThemeProvider>
        </AdminProvider>
      </body>
    </html>
  );
}
