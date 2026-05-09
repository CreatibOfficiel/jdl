import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jdl.thibaud-cb.fr';

export const metadata: Metadata = {
  title: "Jeu de l'Oie Soirée",
  description:
    "Jeu de l'oie multijoueur web — drinking game pensé safe, équivalences sport possibles, jusqu'à 10 joueurs.",
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.webmanifest',
  applicationName: "Jeu de l'Oie Soirée",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JDL Soirée',
  },
  openGraph: {
    type: 'website',
    siteName: "Jeu de l'Oie Soirée",
    title: "Jeu de l'Oie Soirée",
    description:
      "Jeu de l'oie multijoueur web — drinking game safe, équivalences sport disponibles, jusqu'à 10 joueurs.",
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary',
    title: "Jeu de l'Oie Soirée",
    description: 'Drinking game multi-device, safe by design.',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
