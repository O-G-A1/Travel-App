import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: `${process.env.NEXT_PUBLIC_APP_NAME || 'Voyara'} — Travel, thoughtfully planned`, description: 'Your thoughtful AI travel companion. Plan trips, shape flexible itineraries and keep every detail in one place.', applicationName: process.env.NEXT_PUBLIC_APP_NAME || 'Voyara', manifest: '/manifest.json', robots: { index: true, follow: true } };
export const viewport: Viewport = { themeColor: '#f7f7f3' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
