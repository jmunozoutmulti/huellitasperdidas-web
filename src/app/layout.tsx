import type { Metadata, Viewport } from 'next';
import { Google_Sans } from 'next/font/google';
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import PopupPublicar from '@/components/global/PopupPublicar';
import { AppProvider } from '@/context/AppContext';
import 'swiper/css/bundle';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@tabler/icons-webfont/dist/tabler-icons.css';
import './globals.css';
import '@/styles/dark-theme.css';
import '@/styles/publicar.css';
import '@/styles/mi-cuenta.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const google = Google_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Inicio - Huellas Perdidas | Búsqueda de mascotas perdidas',
  description:
    'Ayudamos a encontrar mascotas perdidas y facilitar el reencuentro con sus familias. Publica, busca y comparte casos de mascotas perdidas y encontradas.',
  icons: {
    icon: '/images/isotipo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <body className={`${google.className} ${outfit.variable}`} suppressHydrationWarning>
        <AppProvider>
          <div className="container">
            <Header />
            {children}
            <Footer />
            <PopupPublicar />
          </div>
        </AppProvider>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}