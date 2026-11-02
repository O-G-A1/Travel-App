import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import Marketplace from '@/lib/marketplace';

export const metadata = {
  title: 'Journeys — Voyara',
  description: 'Discover shared interstate and intrastate journeys with Voyara.',
};

export default function JourneysPage() {
  return <main className="public-marketplace-page">
    <header className="public-marketplace-nav">
      <Link className="public-marketplace-brand" href="/"><span className="brand-mark"><Compass size={19}/></span>voyara<span>.</span></Link>
      <Link href="/" className="public-marketplace-signin">Sign in to Voyara <ArrowLeft size={14}/></Link>
    </header>
    <Marketplace session={null}/>
    <footer className="public-marketplace-footer">Voyara journeys · Travel together, arrive well.</footer>
  </main>;
}
