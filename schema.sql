-- Run this in Supabase: SQL Editor -> New query -> Run
create table if not exists leads (
    id bigint generated always as identity primary key,
    name text not null,
    email text not null,
    phone text not null,
    business_name text not null,
    status text not null default 'New'
        check (status in ('New', 'Contacted', 'Converted')),
    created_at timestamptz not null default now()
);

-- Allow the backend to read/write using the service key (RLS stays on)
alter table leads enable row level security;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.leads to service_role;