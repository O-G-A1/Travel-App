import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, BookOpen, CalendarDays, Compass, CreditCard, Heart, MapPin, Sparkles, UsersRound } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Voyara';

export const metadata = {
  title: `${appName} — Make room for the journey`,
  description: 'Thoughtful trip planning, flexible itineraries, shared plans, and the small details that make a trip yours.',
};

const features = [
  { icon: CalendarDays, title: 'A plan with room to breathe', text: 'Shape each day around your dates, travel style, interests, and budget. Keep every suggestion editable.' },
  { icon: MapPin, title: 'Places worth keeping close', text: 'Search and save places on an interactive map. Keep your trusted spots together with your trip.' },
  { icon: CreditCard, title: 'Your spending, in view', text: 'Log expenses in the currency you paid. Compare them with daily reference rates when available.' },
  { icon: BookOpen, title: 'Keep the moments, too', text: 'Add journal notes and photos, collect travel documents, and share a plan with people you trust.' },
];

export default function WelcomePage() {
  return <main className="welcome-page">
    <header className="welcome-nav">
      <Link className="welcome-brand" href="/" aria-label={`${appName} workspace`}><span className="brand-mark"><Compass size={20}/></span><span>{appName.toLowerCase()}<i>.</i></span></Link>
      <nav aria-label="Main navigation"><a href="#features">The good things</a><a href="#how-it-works">A gentler way to plan</a></nav>
      <Link className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'welcome-nav-cta')} href="/">Open your workspace <ArrowRight size={14}/></Link>
    </header>

    <section className="welcome-hero">
      <div className="welcome-hero-copy">
        <span className="section-kicker">A LITTLE SPACE FOR THE JOURNEY</span>
        <h1>Make room for<br/><em>the moments</em><br/>in between.</h1>
        <p>All the plans, places, and small details of a good trip—together in one thoughtful travel space.</p>
        <div className="welcome-hero-actions"><Link className={cn(buttonVariants({ size: 'lg' }), 'welcome-primary')} href="/">Start planning <ArrowRight size={16}/></Link><a className="welcome-text-link" href="#features">Take a little look <ArrowDownRight size={15}/></a></div>
        <div className="welcome-proof"><span><Heart size={14}/> Your trip, your pace</span><span><UsersRound size={14}/> Plan together</span><span><Sparkles size={14}/> Helpful AI drafts</span></div>
      </div>
      <div className="welcome-hero-art">
        <Image src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=85" alt="A quiet alpine lake at the beginning of a journey" width={1600} height={1200} unoptimized priority/>
        <div className="welcome-photo-caption"><span className="caption-dot"/><span>Somewhere new, at your own pace.</span><span>✳</span></div>
        <Card className="welcome-float-card"><span className="section-kicker">A DAY IN KYOTO</span><b>A little wander through Gion</b><small>10:30 · A place to begin</small><div><span>✦</span><span>☕</span><span>⌁</span></div></Card>
      </div>
      <span className="welcome-hero-spark">✳</span>
    </section>

    <section className="welcome-feature-section" id="features">
      <div className="welcome-section-heading"><span className="section-kicker">THE IMPORTANT THINGS, TOGETHER</span><h2>From the first daydream<br/>to the last little note.</h2><p>A good trip is made of details. Keep the useful ones close and leave space for a few surprises.</p></div>
      <div className="welcome-feature-grid">{features.map(({icon:Icon,title,text},index)=><Card className="welcome-feature-card" key={title}><span className={`welcome-feature-icon feature-${index}`}><Icon size={18}/></span><h3>{title}</h3><p>{text}</p><span className="welcome-card-index">0{index+1}</span></Card>)}</div>
    </section>

    <section className="welcome-how" id="how-it-works">
      <div className="welcome-how-art"><Image src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85" alt="A winding mountain road leading toward a new destination" width={1400} height={1000} unoptimized/><span>TAKE THE LONG WAY, WHEN YOU CAN.</span></div>
      <div className="welcome-how-copy"><span className="section-kicker">A GENTLER WAY TO GET THERE</span><h2>Start with a place.<br/>Let the rest take shape.</h2><p>Add your dates, budget, and the kind of trip you have in mind. Voyara can sketch an editable itinerary, while you stay in charge of every choice.</p><ul><li><span>01</span>Bring the people you trust into the plan.</li><li><span>02</span>Keep expenses, packing, and reminders nearby.</li><li><span>03</span>Save the details for the days without a signal.</li></ul><Link className="welcome-text-link" href="/">Make a little plan <ArrowRight size={15}/></Link></div>
    </section>

    <section className="welcome-trust"><div className="welcome-trust-mark"><Compass size={22}/></div><span className="section-kicker">THOUGHTFUL TO THE DETAILS</span><h2>Useful, honest, and yours.</h2><p>AI ideas are drafts to check. Weather shows current conditions only. Maps and travel services need their own connections. Voyara won’t dress an estimate up as a booking.</p><div><span><MapPin size={14}/> You choose what to save</span><span><Heart size={14}/> Private by default</span><span><Sparkles size={14}/> Suggestions, not promises</span></div></section>

    <footer className="welcome-footer"><Link className="welcome-brand" href="/"><span className="brand-mark"><Compass size={18}/></span><span>{appName.toLowerCase()}<i>.</i></span></Link><p>Made for the miles & moments in between.</p><Link className="welcome-text-link" href="/">Open your travel space <ArrowRight size={14}/></Link></footer>
  </main>;
}
