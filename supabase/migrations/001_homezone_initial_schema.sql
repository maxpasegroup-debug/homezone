create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum (
    'buyer',
    'owner',
    'broker',
    'builder',
    'service_provider',
    'admin'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum (
    'draft',
    'pending_review',
    'published',
    'rejected',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.lead_stage as enum (
    'new',
    'qualified',
    'site_visit',
    'negotiation',
    'won',
    'lost',
    'nurture'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  whatsapp_verified boolean not null default false,
  role public.user_role not null default 'buyer',
  country text not null default 'India',
  city text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  intent text not null check (intent in ('buy', 'rent', 'invest', 'sell')),
  property_type text not null,
  country text not null default 'India',
  state text,
  city text not null,
  locality text,
  address text,
  latitude numeric,
  longitude numeric,
  price numeric,
  currency text not null default 'INR',
  area_value numeric,
  area_unit text default 'sqft',
  bedrooms integer,
  bathrooms integer,
  amenities text[] not null default '{}',
  media_urls text[] not null default '{}',
  video_url text,
  status public.listing_status not null default 'draft',
  verified boolean not null default false,
  ai_summary text,
  property_score integer check (property_score between 0 and 100),
  risk_score integer check (risk_score between 0 and 100),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_properties (
  user_id uuid references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text,
  email text,
  message text,
  source text not null default 'HomeZone',
  stage public.lead_stage not null default 'new',
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  next_action text,
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_reels (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null,
  video_url text not null,
  thumbnail_url text,
  likes_count integer not null default 0,
  saves_count integer not null default 0,
  status public.listing_status not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table if not exists public.studio_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  service_type text not null,
  city text,
  budget text,
  notes text,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  category text not null,
  city text not null,
  budget text,
  message text,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  business_name text not null,
  category text not null,
  city text,
  rating numeric not null default 0,
  verified boolean not null default false,
  price_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.builder_projects (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references public.profiles(id) on delete set null,
  name text not null,
  city text not null,
  locality text,
  description text,
  units_count integer,
  available_units integer,
  media_urls text[] not null default '{}',
  campaign_status text not null default 'draft',
  ai_report jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  report_type text not null,
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists properties_city_idx on public.properties(city);
create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_owner_idx on public.properties(owner_id);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists builder_projects_builder_idx on public.builder_projects(builder_id);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.saved_properties enable row level security;
alter table public.leads enable row level security;
alter table public.property_reels enable row level security;
alter table public.studio_requests enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_providers enable row level security;
alter table public.builder_projects enable row level security;
alter table public.ai_reports enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

create policy "published_properties_public_read"
  on public.properties for select
  using (status = 'published' or owner_id = auth.uid() or public.is_admin());

create policy "owners_manage_properties"
  on public.properties for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "saved_properties_owner_only"
  on public.saved_properties for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "leads_related_users"
  on public.leads for select
  using (user_id = auth.uid() or assigned_to = auth.uid() or public.is_admin());

create policy "authenticated_create_leads"
  on public.leads for insert
  with check (auth.uid() is not null);

create policy "assigned_users_manage_leads"
  on public.leads for update
  using (assigned_to = auth.uid() or public.is_admin());

create policy "published_reels_public_read"
  on public.property_reels for select
  using (status = 'published' or owner_id = auth.uid() or public.is_admin());

create policy "owners_manage_reels"
  on public.property_reels for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "requesters_manage_studio"
  on public.studio_requests for all
  using (requester_id = auth.uid() or public.is_admin())
  with check (requester_id = auth.uid() or public.is_admin());

create policy "requesters_manage_service_requests"
  on public.service_requests for all
  using (requester_id = auth.uid() or public.is_admin())
  with check (requester_id = auth.uid() or public.is_admin());

create policy "service_providers_public_read"
  on public.service_providers for select
  using (verified = true or profile_id = auth.uid() or public.is_admin());

create policy "builders_manage_projects"
  on public.builder_projects for all
  using (builder_id = auth.uid() or public.is_admin())
  with check (builder_id = auth.uid() or public.is_admin());

create policy "ai_reports_owner_read"
  on public.ai_reports for select
  using (user_id = auth.uid() or public.is_admin());

create policy "ai_reports_owner_insert"
  on public.ai_reports for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "audit_admin_only"
  on public.audit_logs for select
  using (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('property-media', 'property-media', true),
  ('property-documents', 'property-documents', false),
  ('studio-assets', 'studio-assets', false)
on conflict (id) do nothing;
