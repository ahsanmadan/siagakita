-- Migration: Account Verification Queue & Self-Registration
-- Supports disaster volunteer / field officer self-registration with BPBD Operator batch approval

alter table public.profiles
  add column if not exists verification_status text not null default 'verified' check (verification_status in ('verified', 'pending', 'rejected')),
  add column if not exists requested_role public.app_role default null,
  add column if not exists organization text default null,
  add column if not exists assignment_note text default null,
  add column if not exists verified_at timestamptz default null,
  add column if not exists verified_by uuid references public.profiles(id) default null;

-- Ensure all existing profiles are verified
update public.profiles
set verification_status = 'verified'
where verification_status is null;

-- Index for queue performance
create index if not exists idx_profiles_verification_status on public.profiles(verification_status);
create index if not exists idx_profiles_organization on public.profiles(organization);
