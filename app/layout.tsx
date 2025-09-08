// app/layout.tsx
import { Poppins } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/app/components/LayoutWrapper";
import Footer from "@/app/components/footer";
import AdminProvider from "@/app/components/isAdmin";
import PlaceChecker from "@/app/components/placeChecker"; // 👈 new client component

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
          <LayoutWrapper>{children}</LayoutWrapper>
          <Footer />
          <PlaceChecker /> {/* 👈 runs on client side */}
        </AdminProvider>
      </body>
    </html>
  );
}
