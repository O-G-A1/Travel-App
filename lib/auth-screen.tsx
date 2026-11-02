'use client';
import { FormEvent, useState } from 'react';
import { Compass, Eye, EyeOff, LoaderCircle, Mail, LockKeyhole, ArrowRight, CarFront, UserRound } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AuthScreen({ client, appName }: { client: SupabaseClient; appName: string }) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'passenger'|'driver'>('passenger');
  const [phone, setPhone] = useState('');
  const [homeState, setHomeState] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');
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
        if(accountType==='driver'&&(!vehicleMake.trim()||!vehicleModel.trim()||!vehicleColor.trim()||!plate.trim()))throw new Error('Add your vehicle details to create a driver account.');
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim(), account_type:accountType, phone:phone.trim(), home_state:homeState, vehicle_make:vehicleMake.trim(), vehicle_model:vehicleModel.trim(), vehicle_color:vehicleColor.trim(), plate:plate.trim(), seats:Number(seats) }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath)}` } });
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

  const states=['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
  return <main className="auth-screen">
    <section className="auth-visual"><div className="auth-brand"><span className="brand-mark"><Compass size={21}/></span>{appName.toLowerCase()}<i>.</i></div><div className="auth-visual-copy"><span className="section-kicker">VOYARA NIGERIA</span><h1>Good roads<br/>are better shared.</h1><p>Find a ride, meet fellow travellers, and keep your plans moving across Nigeria.</p></div><span className="auth-visual-credit">Shared rides across Nigerian cities and states</span></section>
    <section className="auth-main"><div className="auth-card"><span className="section-kicker">YOUR TRAVEL SPACE</span><h2>{mode==='signin'?'Welcome back.':mode==='signup'?'Let’s make it yours.':'A fresh start.'}</h2><p>{mode==='signin'?'Sign in to find your trips right where you left them.':mode==='signup'?'Choose how you’ll travel with Voyara.':'We’ll email you a secure password reset link.'}</p>
      <form onSubmit={submit}>
        {mode==='signup'&&<>
          <div className="auth-role-picker" role="group" aria-label="Account type"><button type="button" className={accountType==='passenger'?'active':''} onClick={()=>setAccountType('passenger')}><UserRound size={17}/> Passenger</button><button type="button" className={accountType==='driver'?'active':''} onClick={()=>setAccountType('driver')}><CarFront size={17}/> Driver</button></div>
          <label>Full name<div className="auth-input"><Compass size={16}/><input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name as it appears on ID"/></div></label>
          <label>Phone number<div className="auth-input"><Mail size={16}/><input required type="tel" maxLength={24} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234 800 000 0000"/></div></label>
          <label>Home state<select required className="auth-select" value={homeState} onChange={e=>setHomeState(e.target.value)}><option value="">Select a state</option>{states.map(state=><option key={state} value={state}>{state}</option>)}</select></label>
          {accountType==='driver'&&<fieldset className="driver-signup-fields"><legend>Vehicle details</legend><div>
            <label>Make<input required maxLength={80} value={vehicleMake} onChange={e=>setVehicleMake(e.target.value)} placeholder="Toyota"/></label><label>Model<input required maxLength={80} value={vehicleModel} onChange={e=>setVehicleModel(e.target.value)} placeholder="Corolla"/></label><label>Color<input required maxLength={40} value={vehicleColor} onChange={e=>setVehicleColor(e.target.value)} placeholder="Silver"/></label><label>Plate number<input required maxLength={24} value={plate} onChange={e=>setPlate(e.target.value)} placeholder="ABC 123 XY"/></label><label>Passenger seats<input required type="number" min="1" max="12" value={seats} onChange={e=>setSeats(e.target.value)}/></label>
          </div><small>Driver accounts need identity, licence, and vehicle checks before they can publish rides.</small></fieldset>}
        </>}
        <label>Email address<div className="auth-input"><Mail size={16}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div></label>
        {mode!=='reset'&&<label>Password<div className="auth-input"><LockKeyhole size={16}/><input required minLength={8} type={showPassword?'text':'password'} autoComplete={mode==='signin'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>}
        {error&&<div className="auth-message error" role="alert">{error}</div>}{message&&<div className="auth-message success" role="status">{message}</div>}
        <button className="primary-button auth-submit" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:null}{mode==='signin'?'Sign in':mode==='signup'?'Create account':'Send reset link'}{!busy&&<ArrowRight size={16}/>}</button>
      </form>
      <div className="auth-links">{mode==='signin'&&<button onClick={()=>{setMode('reset');setError('');setMessage('')}}>Forgot password?</button>}<span>{mode==='signin'?'New to Voyara?':mode==='signup'?'Already have an account?':'Remembered it?'}</span><button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');setMessage('')}}>{mode==='signin'?'Create an account':'Sign in'}</button></div><a className="auth-marketplace-link" href="/journeys"><CarFront size={16}/> Explore interstate & intrastate journeys <ArrowRight size={15}/></a><div className="auth-privacy">Identity documents are private and only submitted for verification.</div>
    </div></section>
  </main>;
}
