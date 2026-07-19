-- Migration: create admin_password_resets table
-- Run this in Supabase SQL editor or via your migration tooling.

create extension if not exists "pgcrypto";

create table if not exists admin_password_resets (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid,
  email text not null,
  admin_user_id uuid,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_admin_password_resets_target_user on admin_password_resets(target_user_id);
create index if not exists idx_admin_password_resets_created_at on admin_password_resets(created_at);
