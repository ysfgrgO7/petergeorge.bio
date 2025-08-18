import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/app/components/LayoutWrapper";
import DisableRightClick from "@/app/components/disableRightClicks";

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Master Biology",
  description: "Learn Biology",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <DisableRightClick /> {/* 👈 Inject client logic */}
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
