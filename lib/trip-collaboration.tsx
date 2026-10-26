'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Copy, Link2, LoaderCircle, Trash2, UsersRound } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';

type Invite = { id: string; invite_email: string; role: 'editor' | 'viewer'; expires_at: string; accepted_at: string | null };
type Member = { user_id: string; role: 'editor' | 'viewer'; display_name?: string | null };
export default function TripCollaboration({ tripId, tripName, client, userId, notify }: { tripId: string; tripName: string; client: SupabaseClient | null; userId: string | null; notify: (message: string) => void }) {
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerName, setOwnerName] = useState('Trip owner');
  const [myRole, setMyRole] = useState<'editor'|'viewer'>('editor');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true); setError(''); setInviteUrl('');
    if (!client || !userId || !tripId) { setLoading(false); return () => { current = false; }; }
    void (async () => {
      const { data: trip, error: tripError } = await client.from('trips').select('owner_id').eq('id', tripId).maybeSingle();
      if (!current) return;
      if (tripError || !trip) { setError('Could not load sharing details for this trip.'); setLoading(false); return; }
      const owner = trip.owner_id === userId;
      setIsOwner(owner);
      const { data: memberRows, error: memberError } = await client.from('trip_members').select('user_id,role').eq('trip_id', tripId);
      if (!current) return;
      if (memberError) setError('Could not load the collaborator list.');
      else {
        const rows=(memberRows||[]) as Member[];
        setMyRole(rows.find((member)=>member.user_id===userId)?.role||'editor');
        const profileIds=[trip.owner_id,...rows.map((member)=>member.user_id)];
        const {data:profiles}=await client.from('profiles').select('id,display_name').in('id',profileIds);
        const names=new Map((profiles||[]).map((profile:{id:string;display_name:string|null})=>[profile.id,profile.display_name]));
        setOwnerName(names.get(trip.owner_id)||'Trip owner');
        setMembers(rows.filter((member)=>member.user_id!==trip.owner_id&&member.user_id!==userId).map((member)=>({...member,display_name:names.get(member.user_id)})));
      }
      if (owner) {
        const { data: inviteRows, error: inviteError } = await client.from('trip_invites').select('id,invite_email,role,expires_at,accepted_at').eq('trip_id', tripId).order('created_at', { ascending: false });
        if (!current) return;
        if (inviteError) setError('Could not load invitations. Apply migration 007 if this feature is not available.');
        else setInvites((inviteRows || []) as Invite[]);
      }
      setLoading(false);
    })().catch(() => { if (current) { setError('Could not reach your trip settings.'); setLoading(false); } });
    return () => { current = false; };
  }, [client, userId, tripId]);

  async function createInvite(event: FormEvent) {
    event.preventDefault(); if (!client || !isOwner) return;
    setBusy(true); setError(''); setInviteUrl('');
    try {
      const { data, error: inviteError } = await client.rpc('create_trip_invite', { p_trip_id: tripId, p_email: email.trim(), p_role: role });
      if (inviteError || typeof data !== 'string') throw new Error(inviteError?.message || 'Could not create this invitation.');
      const url = new URL(window.location.origin); url.hash = `invite=${data}`;
      setInviteUrl(url.toString());
      setEmail('');
      const { data: rows } = await client.from('trip_invites').select('id,invite_email,role,expires_at,accepted_at').eq('trip_id', tripId).order('created_at', { ascending: false });
      setInvites((rows || []) as Invite[]);
      notify('Invitation link created. Share it privately with the invited person.');
    } catch (inviteError) { setError(inviteError instanceof Error ? inviteError.message : 'Could not create this invitation.'); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(inviteUrl); notify('Invitation link copied.'); }
    catch { setError('Copy was unavailable. Select and copy the invitation link below.'); }
  }

  async function revokeInvite(invite: Invite) {
    if (!client || !window.confirm(`Revoke the invitation for ${invite.invite_email}?`)) return;
    const { error: deleteError } = await client.from('trip_invites').delete().eq('id', invite.id);
    if (deleteError) { setError('Could not revoke this invitation.'); return; }
    setInvites((current) => current.filter((item) => item.id !== invite.id));
  }

  async function changeMemberRole(member: Member, nextRole: 'editor'|'viewer') {
    if (!client || !isOwner) return;
    const { error: updateError } = await client.from('trip_members').update({ role: nextRole }).eq('trip_id', tripId).eq('user_id', member.user_id);
    if (updateError) { setError('Could not update this collaborator’s access.'); return; }
    setMembers((current) => current.map((item) => item.user_id === member.user_id ? { ...item, role: nextRole } : item));
  }

  async function removeMember(member: Member) {
    if (!client || !isOwner || !window.confirm(`Remove ${member.display_name || 'this collaborator'} from the trip?`)) return;
    const { error: deleteError } = await client.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', member.user_id);
    if (deleteError) { setError('Could not remove this collaborator.'); return; }
    setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
    notify('Collaborator removed from this trip.');
  }

  if (!client || !userId) return <section className="collaboration-view"><div className="collaboration-heading"><span className="section-kicker">MAKE ROOM AT THE TABLE</span><h2>Plan together.</h2><p>Sign in and configure Supabase to invite someone to this trip.</p></div><div className="collaboration-empty panel"><UsersRound/><h3>Collaborative planning needs a cloud account.</h3><p>In demo mode, this trip and its planning details stay in this browser.</p></div></section>;

  return <section className="collaboration-view">
    <div className="collaboration-heading"><span className="section-kicker">MAKE ROOM AT THE TABLE</span><h2>Plan {tripName} together.</h2><p>Invite someone to see the plan and contribute at the level you choose.</p></div>
    <Card className="collaboration-note panel"><UsersRound size={17}/><span>Editors can add and change shared trip details. Viewers can see trip details without editing. Emergency contacts, saved places, and personal profile data stay private to each account.</span></Card>
    {loading ? <div className="collaboration-empty panel"><LoaderCircle className="spin"/>Loading sharing settings…</div> : <>
      {isOwner ? <form className="invite-form panel" onSubmit={createInvite}><div><span className="section-kicker">SEND A PRIVATE LINK</span><h3>Invite a travel companion.</h3><p>Voyara does not send email. Copy the link and share it yourself.</p></div><label>EMAIL<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com"/></label><label>ACCESS<select value={role} onChange={(event) => setRole(event.target.value as 'editor'|'viewer')}><option value="editor">Can edit</option><option value="viewer">Can view</option></select></label><button className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create invitation'} <Link2 size={14}/></button></form> : <div className="collaboration-note panel">Only the trip owner can send or revoke invitations.</div>}
      {inviteUrl && <div className="invite-link panel"><div><span className="section-kicker">INVITATION LINK · EXPIRES IN 7 DAYS</span><input aria-label="Invitation link" readOnly value={inviteUrl}/><small>Only the invited email address can accept this link. Anyone with the link can attempt to use it, so share it privately.</small></div><button className="quiet-button" onClick={() => void copyLink()}><Copy size={14}/> Copy link</button></div>}
      {error && <p className="collaboration-error" role="alert">{error}</p>}
      <section className="collaborator-list panel"><header><div><span className="section-kicker">ALONG FOR THE JOURNEY</span><h3>People on this trip</h3></div><span>{members.length + (isOwner ? 1 : 2)} members</span></header><article className="collaborator-row"><span className="collaborator-avatar">{(isOwner?'Y':ownerName.slice(0,1)).toUpperCase()}</span><div><b>{isOwner?'You':ownerName}</b><small>Trip owner</small></div><span className="role-pill">Owner</span></article>{!isOwner&&<article className="collaborator-row"><span className="collaborator-avatar">Y</span><div><b>You</b><small>Collaborator</small></div><span className="role-pill">{myRole==='editor'?'Can edit':'Can view'}</span></article>}{members.map((member) => <article className="collaborator-row" key={member.user_id}><span className="collaborator-avatar">{(member.display_name||'T').slice(0,1).toUpperCase()}</span><div><b>{member.display_name||'Voyara traveler'}</b><small>Collaborator</small></div>{isOwner?<><select className="member-role-select" aria-label={`Access for ${member.display_name||'collaborator'}`} value={member.role} onChange={(event)=>void changeMemberRole(member,event.target.value as 'editor'|'viewer')}><option value="editor">Can edit</option><option value="viewer">Can view</option></select><button className="delete-trip" onClick={()=>void removeMember(member)} aria-label={`Remove ${member.display_name||'collaborator'}`}><Trash2 size={14}/></button></>:<span className="role-pill">{member.role === 'editor' ? 'Can edit' : 'Can view'}</span>}</article>)}</section>
      {isOwner && invites.length > 0 && <section className="invite-list panel"><header><div><span className="section-kicker">INVITATIONS</span><h3>Shared links</h3></div></header>{invites.map((invite) => <article className="collaborator-row" key={invite.id}><span className="collaborator-avatar"><Link2 size={14}/></span><div><b>{invite.invite_email}</b><small>{invite.accepted_at ? 'Accepted' : new Date(invite.expires_at) <= new Date() ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}</small></div><span className="role-pill">{invite.role === 'editor' ? 'Can edit' : 'Can view'}</span><button className="delete-trip" onClick={() => void revokeInvite(invite)} aria-label={`Revoke invitation for ${invite.invite_email}`}><Trash2 size={14}/></button></article>)}</section>}
    </>}
    <p className="collaboration-footnote">Invitees must sign in using the email address entered above. Links expire after seven days and can be revoked here.</p>
  </section>;
}
