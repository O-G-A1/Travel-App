import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: `${process.env.NEXT_PUBLIC_APP_NAME || 'Voyara'} — Shared rides across Nigeria`, description: 'Find shared rides, connect with verified drivers and passengers, and travel between Nigerian cities and states.', applicationName: process.env.NEXT_PUBLIC_APP_NAME || 'Voyara', manifest: '/manifest.json', robots: { index: true, follow: true } };
export const viewport: Viewport = { themeColor: '#174b36' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
