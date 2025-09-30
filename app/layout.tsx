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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <AdminProvider>
          <ThemeProvider>
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
