'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FileText, ImagePlus, LoaderCircle, Plus, Trash2, Upload, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createId } from './create-id';

type JournalRow = { id: string; trip_id?: string; entry_date: string; title: string | null; body: string | null; author_id?: string; photo_paths?: string[] };
type DocumentRow = { id: string; trip_id: string; uploaded_by?: string; storage_path: string; file_name: string; content_type: string | null; created_at: string };
type Props = { tripId: string; tripName: string; client: SupabaseClient | null; userId: string | null; mode: 'journal' | 'documents' };
const bucket = 'voyara-trip-documents';
const maxFileSize = 15 * 1024 * 1024;
const acceptedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function TripVault({ tripId, tripName, client, userId, mode }: Props) {
  const [entries, setEntries] = useState<JournalRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string,string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let current = true;
    setLoaded(false);
    setLoading(true);
    setError('');
    if (mode === 'journal' && !client) {
      try {
        const local = localStorage.getItem(`voyara:journal:v1:${tripId}`);
        setEntries(local ? JSON.parse(local) as JournalRow[] : []);
      } catch { setEntries([]); }
      setLoaded(true);
      setLoading(false);
    } else if (!client || !userId || !tripId) {
      setEntries([]); setDocuments([]); setLoaded(true); setLoading(false);
    } else {
      const table = mode === 'journal' ? client.from('journal_entries').select('id,trip_id,entry_date,title,body,author_id,photo_paths').eq('trip_id', tripId).order('entry_date', { ascending: false }) : client.from('trip_documents').select('id,trip_id,uploaded_by,storage_path,file_name,content_type,created_at').eq('trip_id', tripId).order('created_at', { ascending: false });
      void (async () => {
        try {
          const { data, error: queryError } = await table;
          if (!current) return;
          if (queryError) setError(`Could not load ${mode === 'journal' ? 'journal entries' : 'documents'}. Check that the latest Voyara migrations are applied.`);
          else if (mode === 'journal') setEntries((data || []) as JournalRow[]);
          else setDocuments((data || []) as DocumentRow[]);
        } catch {
          if (current) setError('Could not reach your trip data. Check your connection and try again.');
        } finally {
          if (current) { setLoaded(true); setLoading(false); }
        }
      })();
    }
    return () => { current = false; };
  }, [client, userId, tripId, mode]);

  useEffect(() => {
    if (mode !== 'journal' || !client) { setPhotoUrls({}); return; }
    const paths = [...new Set(entries.flatMap((entry) => entry.photo_paths || []))];
    if (!paths.length) { setPhotoUrls({}); return; }
    let current = true;
    void client.storage.from(bucket).createSignedUrls(paths, 300).then(({ data }) => {
      if (!current || !data) return;
      setPhotoUrls(Object.fromEntries(data.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl as string])));
    });
    return () => { current = false; };
  }, [client, entries, mode]);

  useEffect(() => {
    if (loaded && mode === 'journal' && !client) {
      try { localStorage.setItem(`voyara:journal:v1:${tripId}`, JSON.stringify(entries)); } catch { /* Storage may be unavailable or full. */ }
    }
  }, [entries, loaded, mode, client, tripId]);

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() && !body.trim()) { setError('Add a title or a few words before saving.'); return; }
    setSaving(true); setError('');
    if (photos.length > 5 || photos.some((file) => !imageTypes.has(file.type) || file.size > 4 * 1024 * 1024)) { setError('Attach up to 5 JPEG, PNG, or WebP photos, each under 4 MB.'); return; }
    const draft = { entry_date: entryDate, title: title.trim() || null, body: body.trim() || null };
    const newlyUploadedPaths: string[] = [];
    try {
      if (client && userId) {
        const existingPaths = entries.find((entry) => entry.id === editing)?.photo_paths || [];
        for (const file of photos) {
          const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
          const path = `${tripId}/journal/${createId()}.${extension}`;
          const { error: uploadError } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw new Error('Could not upload a journal photo. Check the private trip storage setup.');
          newlyUploadedPaths.push(path);
        }
        const photoPaths = [...existingPaths, ...newlyUploadedPaths];
        const query = editing
          ? client.from('journal_entries').update({ ...draft, photo_paths: photoPaths }).eq('id', editing).eq('author_id', userId).select('id,trip_id,entry_date,title,body,author_id,photo_paths').single()
          : client.from('journal_entries').insert({ ...draft, trip_id: tripId, author_id: userId, photo_paths: photoPaths }).select('id,trip_id,entry_date,title,body,author_id,photo_paths').single();
        const { data, error: saveError } = await query;
        if (saveError) throw new Error('Could not save this journal entry. Check that you can edit this trip.');
        setEntries((current) => editing ? current.map((entry) => entry.id === editing ? data as JournalRow : entry) : [data as JournalRow, ...current]);
      } else {
        if (photos.length) throw new Error('Journal photo storage needs a connected Supabase account.');
        const item: JournalRow = { id: editing || createId(), ...draft };
        setEntries((current) => editing ? current.map((entry) => entry.id === editing ? item : entry) : [item, ...current]);
      }
      setTitle(''); setBody(''); setPhotos([]); setEditing(null); setEntryDate(new Date().toISOString().slice(0, 10));
    } catch (saveError) { if (client && newlyUploadedPaths.length) await client.storage.from(bucket).remove(newlyUploadedPaths); setError(saveError instanceof Error ? saveError.message : 'Could not save the journal entry.'); }
    finally { setSaving(false); }
  }

  function editEntry(entry: JournalRow) {
    setEditing(entry.id); setTitle(entry.title || ''); setBody(entry.body || ''); setPhotos([]); setEntryDate(entry.entry_date);
    document.querySelector('.vault-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteEntry(entry: JournalRow) {
    if (!window.confirm('Delete this journal entry?')) return;
    if (client && userId) {
      const { error: deleteError } = await client.from('journal_entries').delete().eq('id', entry.id).eq('author_id', userId);
      if (deleteError) { setError('Could not delete this journal entry.'); return; }
      if (entry.photo_paths?.length) {
        const { error: photoError } = await client.storage.from(bucket).remove(entry.photo_paths);
        if (photoError) setError('The journal entry was deleted, but its photos could not be removed from storage.');
      }
    }
    setEntries((current) => current.filter((item) => item.id !== entry.id));
  }

  async function uploadFile(file: File) {
    if (!client || !userId) { setError('Sign in and connect Supabase to securely upload trip documents.'); return; }
    if (!acceptedTypes.has(file.type)) { setError('Choose a PDF, JPEG, PNG, WebP, text, or DOCX file.'); return; }
    if (file.size <= 0 || file.size > maxFileSize) { setError('Files must be smaller than 15 MB.'); return; }
    setSaving(true); setError('');
    const safeName = file.name.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || 'travel-document';
    const path = `${tripId}/${createId()}-${safeName}`;
    try {
      const { error: uploadError } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error('Upload failed. Confirm that migration 006 created the private document bucket.');
      const { data, error: recordError } = await client.from('trip_documents').insert({ trip_id: tripId, uploaded_by: userId, storage_path: path, file_name: safeName, content_type: file.type }).select('id,trip_id,uploaded_by,storage_path,file_name,content_type,created_at').single();
      if (recordError) { await client.storage.from(bucket).remove([path]); throw new Error('The upload completed, but its trip record could not be saved.'); }
      setDocuments((current) => [data as DocumentRow, ...current]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Could not upload this file.'); }
    finally { setSaving(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  async function openDocument(file: DocumentRow) {
    if (!client) return;
    const { data, error: urlError } = await client.storage.from(bucket).createSignedUrl(file.storage_path, 60);
    if (urlError || !data?.signedUrl) { setError('Could not create a secure link to this file.'); return; }
    window.location.assign(data.signedUrl);
  }

  async function deleteDocument(file: DocumentRow) {
    if (!client || !window.confirm(`Delete “${file.file_name}” from this trip?`)) return;
    setError('');
    const { error: objectError } = await client.storage.from(bucket).remove([file.storage_path]);
    if (objectError) { setError('Could not remove the stored file.'); return; }
    const { error: recordError } = await client.from('trip_documents').delete().eq('id', file.id);
    if (recordError) { setError('The file was removed, but its record could not be deleted. Refresh this list.'); return; }
    setDocuments((current) => current.filter((item) => item.id !== file.id));
  }

  if (mode === 'journal') return <section className="trip-vault">
    <div className="vault-heading"><div><span className="section-kicker">MOMENTS ALONG THE WAY</span><h2>Your {tripName} journal.</h2><p>A little note can bring the whole day back.</p></div></div>
    <form className="vault-editor panel" onSubmit={saveEntry}>
      <div className="vault-form-heading"><div><span className="section-kicker">{editing ? 'EDIT THIS MEMORY' : 'SAVE A MEMORY'}</span><h3>{editing ? 'A moment worth keeping.' : 'How did today feel?'}</h3></div>{editing && <button type="button" className="quiet-button" onClick={() => { setEditing(null); setTitle(''); setBody(''); setPhotos([]); }}>Cancel <X size={13}/></button>}</div>
      <div className="vault-fields"><label>DATE<input type="date" required value={entryDate} onChange={(event) => setEntryDate(event.target.value)}/></label><label>HEADING <span className="optional">OPTIONAL</span><input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A morning by the water"/></label></div>
      <label className="vault-body-label">YOUR NOTE<textarea maxLength={8000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="The tiny details you want to remember…"/></label>
      <label className={`journal-photo-picker ${!client ? 'photo-picker-disabled' : ''}`}><ImagePlus size={15}/><span>{photos.length ? `${photos.length} photo${photos.length===1?'':'s'} selected` : 'Add photos'}<small>Up to 5 JPEG, PNG, or WebP images, 4 MB each</small></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!client || saving} onChange={(event) => { const selected=Array.from(event.target.files||[]); if(selected.length>5){setError('Choose up to 5 photos for each journal entry.');return;} setPhotos(selected); }}/></label>
      <Button className="primary-button" type="submit" disabled={saving}><Plus size={14}/>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to journal'}</Button>
    </form>
    {error && <p className="vault-error" role="alert">{error}</p>}
    {loading ? <div className="vault-empty panel"><LoaderCircle className="spin"/>Loading journal…</div> : entries.length ? <div className="journal-list">{entries.map((entry) => <article className="journal-card panel" key={entry.id}><time>{new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</time><h3>{entry.title || 'A day to remember'}</h3><p>{entry.body}</p>{entry.photo_paths?.length? <div className="journal-photo-grid">{entry.photo_paths.map((path)=><div key={path} className="journal-photo-frame">{photoUrls[path]?<Image src={photoUrls[path]} width={800} height={600} unoptimized alt={entry.title||'Journal memory'} loading="lazy"/>:<span>Photo unavailable</span>}</div>)}</div>:null}{(!client || entry.author_id===userId)&&<div className="vault-actions"><button className="quiet-button" onClick={() => editEntry(entry)}>Edit</button><button className="quiet-button" onClick={() => void deleteEntry(entry)}><Trash2 size={13}/> Delete</button></div>}</article>)}</div> : <div className="vault-empty panel"><ImagePlus/><h3>The first page is yours.</h3><p>Write down a place, a meal, or a moment you want to remember.</p></div>}
    <p className="vault-note">Journal notes and photos are visible to trip members in cloud mode. Demo mode stores text notes locally; photo storage requires Supabase.</p>
  </section>;

  return <section className="trip-vault">
    <div className="vault-heading"><div><span className="section-kicker">ONE SAFE PLACE FOR THE IMPORTANT THINGS</span><h2>{tripName} documents.</h2><p>Keep copies of the travel details you may need on the road.</p></div><label className={`primary-button vault-upload ${saving ? 'disabled' : ''}`}><Upload size={14}/>{saving ? 'Uploading…' : 'Add document'}<input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx" disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }}/></label></div>
    <div className="vault-security panel"><FileText size={17}/><span>Files are stored in a private bucket. Voyara issues a short-lived link only when you open a document. Maximum file size: 15 MB.</span></div>
    {!client && <div className="vault-setup panel">Document upload needs a Supabase account and migration 006. You can still prepare the feature in demo mode; files are intentionally not stored in browser storage.</div>}
    {error && <p className="vault-error" role="alert">{error}</p>}
    {loading ? <div className="vault-empty panel"><LoaderCircle className="spin"/>Loading documents…</div> : documents.length ? <div className="document-list">{documents.map((file) => <article className="document-card panel" key={file.id}><span className="document-icon"><FileText size={17}/></span><div className="document-copy"><b>{file.file_name}</b><small>{file.content_type || 'File'} · Added {new Date(file.created_at).toLocaleDateString()}</small></div><button className="quiet-button" onClick={() => void openDocument(file)}>Open</button>{file.uploaded_by===userId&&<button className="delete-trip" onClick={() => void deleteDocument(file)} aria-label={`Delete ${file.file_name}`}><Trash2 size={14}/></button>}</article>)}</div> : <div className="vault-empty panel"><FileText/><h3>Your travel papers, together.</h3><p>Store tickets, confirmations, and copies of important documents for this trip.</p>{client && <button className="quiet-button" onClick={() => inputRef.current?.click()}><Plus size={13}/> Add a document</button>}</div>}
    <p className="vault-note">Do not upload documents you do not need to carry. Anyone who can edit this trip can add or delete its files.</p>
  </section>;
}
