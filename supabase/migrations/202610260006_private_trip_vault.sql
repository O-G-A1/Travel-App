-- Correct ownership checks before exposing the existing journal and document tables in the UI.
drop policy if exists journal_edit on public.journal_entries;
drop policy if exists journal_insert_own on public.journal_entries;
drop policy if exists journal_update_own on public.journal_entries;
drop policy if exists journal_delete_own on public.journal_entries;
create policy journal_insert_own on public.journal_entries for insert
 with check(public.can_edit_trip(trip_id) and author_id=auth.uid());
create policy journal_update_own on public.journal_entries for update
 using(public.can_edit_trip(trip_id) and author_id=auth.uid())
 with check(public.can_edit_trip(trip_id) and author_id=auth.uid());
create policy journal_delete_own on public.journal_entries for delete
 using(public.can_edit_trip(trip_id) and author_id=auth.uid());

drop policy if exists documents_edit on public.trip_documents;
drop policy if exists documents_insert_own on public.trip_documents;
drop policy if exists documents_update_own on public.trip_documents;
drop policy if exists documents_delete_own on public.trip_documents;
create policy documents_insert_own on public.trip_documents for insert
 with check(public.can_edit_trip(trip_id) and uploaded_by=auth.uid());
create policy documents_update_own on public.trip_documents for update
 using(public.can_edit_trip(trip_id) and uploaded_by=auth.uid())
 with check(public.can_edit_trip(trip_id) and uploaded_by=auth.uid());
create policy documents_delete_own on public.trip_documents for delete
 using(public.can_edit_trip(trip_id) and uploaded_by=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
 'voyara-trip-documents', 'voyara-trip-documents', false, 15728640,
 array['application/pdf','image/jpeg','image/png','image/webp','text/plain',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict(id) do update set
 public=false,
 file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists trip_documents_storage_read on storage.objects;
drop policy if exists trip_documents_storage_insert on storage.objects;
drop policy if exists trip_documents_storage_update on storage.objects;
drop policy if exists trip_documents_storage_delete on storage.objects;
create policy trip_documents_storage_read on storage.objects for select
 using(bucket_id='voyara-trip-documents' and public.can_access_trip(((storage.foldername(name))[1])::uuid));
create policy trip_documents_storage_insert on storage.objects for insert
 with check(bucket_id='voyara-trip-documents' and public.can_edit_trip(((storage.foldername(name))[1])::uuid));
create policy trip_documents_storage_update on storage.objects for update
 using(bucket_id='voyara-trip-documents' and public.can_edit_trip(((storage.foldername(name))[1])::uuid))
 with check(bucket_id='voyara-trip-documents' and public.can_edit_trip(((storage.foldername(name))[1])::uuid));
create policy trip_documents_storage_delete on storage.objects for delete
 using(bucket_id='voyara-trip-documents' and public.can_edit_trip(((storage.foldername(name))[1])::uuid));
