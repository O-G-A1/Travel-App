'use client';
import { FormEvent, useState } from 'react';
import { Compass, Eye, EyeOff, LoaderCircle, Mail, LockKeyhole, ArrowRight } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AuthScreen({ client, appName }: { client: SupabaseClient; appName: string }) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      } else if (mode === 'signup') {
        const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath)}` } });
        if (authError) throw authError;
        if (!data.session) setMessage('Check your email for a confirmation link. We’ll open your Voyara space when you confirm.');
      } else {
        const { error: authError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password&type=recovery` });
        if (authError) throw authError;
        setMessage('If an account exists for that address, a password reset link is on its way.');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'We could not complete that request. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen"><section className="auth-visual"><div className="auth-brand"><span className="brand-mark"><Compass size={21}/></span>{appName.toLowerCase()}<i>.</i></div><div className="auth-visual-copy"><span className="section-kicker">MAKE ROOM FOR THE JOURNEY</span><h1>Good trips begin<br/>with a little wonder.</h1><p>Keep all the plans, places and little details together. Your next chapter is waiting.</p></div><span className="auth-visual-credit">A quieter kind of travel planning</span></section><section className="auth-main"><div className="auth-card"><span className="section-kicker">YOUR TRAVEL SPACE</span><h2>{mode === 'signin' ? 'Welcome back.' : mode === 'signup' ? 'Let’s make it yours.' : 'A fresh start.'}</h2><p>{mode === 'signin' ? 'Sign in to find your trips right where you left them.' : mode === 'signup' ? 'Create your account and start dreaming.' : 'We’ll email you a secure password reset link.'}</p><form onSubmit={submit}>
    {mode === 'signup' && <label>Your name<div className="auth-input"><Compass size={16}/><input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="How should we call you?"/></div></label>}
    <label>Email address<div className="auth-input"><Mail size={16}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div></label>
    {mode !== 'reset' && <label>Password<div className="auth-input"><LockKeyhole size={16}/><input required minLength={8} type={showPassword?'text':'password'} autoComplete={mode==='signin'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>}
    {error&&<div className="auth-message error" role="alert">{error}</div>}{message&&<div className="auth-message success" role="status">{message}</div>}
    <button className="primary-button auth-submit" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:null}{mode==='signin'?'Sign in':mode==='signup'?'Create account':'Send reset link'}{!busy&&<ArrowRight size={16}/>}</button>
  </form><div className="auth-links">{mode==='signin'&&<button onClick={()=>{setMode('reset');setError('');setMessage('')}}>Forgot password?</button>}<span>{mode==='signin'?'New to Voyara?':mode==='signup'?'Already have an account?':'Remembered it?'}</span><button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');setMessage('')}}>{mode==='signin'?'Create an account':'Sign in'}</button></div><div className="auth-privacy">Your trip details stay private to your account.</div></div></section></main>;
}
