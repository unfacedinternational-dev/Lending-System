-- FINANCE HUB OF THE NORTH
-- Supabase schema for real borrower/financer data, RLS and loan calculations.
-- Apply through Supabase SQL Editor/migrations.

create schema if not exists private;
create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('financer','borrower')),
  created_at timestamptz not null default now()
);

create table if not exists public.borrowers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  mobile_number text not null unique,
  facebook_name text,
  facebook_url text,
  other_information jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  loan_amount numeric(12,2) not null check (loan_amount >= 1000 and loan_amount <= 2000),
  amount_to_return numeric(12,2) generated always as (round(loan_amount * 1.10, 2)) stored,
  release_date date not null,
  due_date date generated always as (release_date + 6) stored,
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete restrict,
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  document_type text not null,
  file_name text not null,
  storage_path text not null unique,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  borrower_visible boolean not null default true
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers(id) on delete restrict,
  note_text text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists borrowers_auth_user_id_idx on public.borrowers(auth_user_id);
create index if not exists borrowers_mobile_number_idx on public.borrowers(mobile_number);
create index if not exists loans_borrower_id_idx on public.loans(borrower_id);
create index if not exists payments_loan_id_idx on public.payments(loan_id);
create index if not exists payments_borrower_id_idx on public.payments(borrower_id);
create index if not exists documents_borrower_id_idx on public.documents(borrower_id);
create index if not exists notes_borrower_id_idx on public.notes(borrower_id);

create or replace function private.is_financer()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'financer'
  );
$$;

revoke all on function private.is_financer() from public, anon, authenticated;
grant execute on function private.is_financer() to authenticated;

create or replace function public.link_borrower_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.phone is not null then
    update public.borrowers
    set auth_user_id = new.id, updated_at = now()
    where mobile_number = regexp_replace(new.phone, '^\\+63', '0')
      and auth_user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_borrower on auth.users;
create trigger on_auth_user_created_link_borrower
after insert on auth.users
for each row execute procedure public.link_borrower_auth_user();

alter table public.user_roles enable row level security;
alter table public.borrowers enable row level security;
alter table public.loans enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;

revoke all on public.user_roles, public.borrowers, public.loans, public.payments, public.documents, public.notes from anon;
grant select on public.borrowers, public.loans, public.payments, public.documents to authenticated;
grant select, insert, update, delete on public.user_roles, public.borrowers, public.loans, public.payments, public.documents, public.notes to authenticated;

drop policy if exists financer_user_roles on public.user_roles;
create policy financer_user_roles on public.user_roles for all to authenticated
using ((select private.is_financer()))
with check ((select private.is_financer()));

drop policy if exists financer_borrowers on public.borrowers;
create policy financer_borrowers on public.borrowers for all to authenticated
using ((select private.is_financer()))
with check ((select private.is_financer()));

drop policy if exists borrower_own_profile on public.borrowers;
create policy borrower_own_profile on public.borrowers for select to authenticated
using ((select auth.uid()) = auth_user_id);

drop policy if exists financer_loans on public.loans;
create policy financer_loans on public.loans for all to authenticated
using ((select private.is_financer()))
with check ((select private.is_financer()));

drop policy if exists borrower_own_loans on public.loans;
create policy borrower_own_loans on public.loans for select to authenticated
using (exists (
  select 1 from public.borrowers b
  where b.id = loans.borrower_id and b.auth_user_id = (select auth.uid())
));

drop policy if exists financer_payments on public.payments;
create policy financer_payments on public.payments for all to authenticated
using ((select private.is_financer()))
with check ((select private.is_financer()));

drop policy if exists borrower_own_payments on public.payments;
create policy borrower_own_payments on public.payments for select to authenticated
using (exists (
  select 1 from public.borrowers b
  where b.id = payments.borrower_id and b.auth_user_id = (select auth.uid())
));

drop policy if exists financer_documents on public.documents;
create policy financer_documents on public.documents for all to authenticated
using ((select private.is_financer()))
with check ((select private.is_financer()));

drop policy if exists borrower_own_documents on public.documents;
create policy borrower_own_documents on public.documents for select to authenticated
using (borrower_visible and exists (
  select 1 from public.borrowers b
  where b.id = documents.borrower_id and b.auth_user_id = (select auth.uid())
));

drop policy if exists financer_notes on public.notes;
create policy financer_notes on public.notes for all to authenticated
using ((select private.is_financer()))
with check ((select private.is_financer()));

create or replace function public.loan_amount_to_return(p_loan_id uuid)
returns numeric language sql stable
as $$ select amount_to_return from public.loans where id = p_loan_id; $$;

create or replace function public.loan_amount_paid(p_loan_id uuid)
returns numeric language sql stable
as $$ select coalesce(sum(amount),0) from public.payments where loan_id = p_loan_id; $$;

create or replace function public.loan_remaining_balance(p_loan_id uuid)
returns numeric language sql stable
as $$
  select greatest(
    0,
    (select amount_to_return from public.loans where id = p_loan_id)
    - coalesce((select sum(amount) from public.payments where loan_id = p_loan_id),0)
  );
$$;

revoke all on function public.loan_amount_to_return(uuid), public.loan_amount_paid(uuid), public.loan_remaining_balance(uuid) from public, anon;
grant execute on function public.loan_amount_to_return(uuid), public.loan_amount_paid(uuid), public.loan_remaining_balance(uuid) to authenticated;
