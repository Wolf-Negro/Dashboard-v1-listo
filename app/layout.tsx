import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// ESTO HACE QUE SE VEA COMO APP EN EL CELULAR
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita que hagan zoom por error, se siente nativo
};

export const metadata: Metadata = {
  title: "Naturaleza Divina Ads",
  description: "Monitor de Pauta en Tiempo Real",
  manifest: "/manifest.json", // Conexión con el archivo que creamos
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ads Monitor",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}