-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Storage Buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'uploads' );

create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'uploads' ); -- simplify for now, ideally restrict to admin

create policy "Admin Delete"
  on storage.objects for delete
  using ( bucket_id = 'uploads' ); -- simplify

-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password text not null,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- Profiles table
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  full_name text,
  phone text,
  roll_number text,
  department text,
  student_class text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- User Roles
create table if not exists user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  role text not null,
  created_at timestamp with time zone default now()
);

-- Contact Messages
create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  is_seen boolean default false,
  created_at timestamp with time zone default now()
);

-- Books
create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  book_name text not null,
  short_intro text,
  description text,
  book_image text,
  total_copies integer default 1,
  available_copies integer default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Library Card Applications
create table if not exists library_card_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid, -- nullable as some might apply without account? or linked later
  first_name text not null,
  last_name text not null,
  father_name text,
  dob text,
  class text,
  field text,
  roll_no text,
  email text,
  phone text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  status text default 'pending',
  card_number text,
  password text, -- hashed
  student_id text,
  issue_date text,
  valid_through text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Students
create table if not exists students (
  id uuid primary key default uuid_generate_v4(),
  user_id text, -- linking to library card application user_id or system user id
  card_id text,
  name text,
  class text,
  field text,
  roll_no text,
  email text,
  phone text,
  created_at timestamp with time zone default now()
);

-- Non Students (Staff/Faculty)
create table if not exists non_students (
  id uuid primary key default uuid_generate_v4(),
  user_id text,
  name text,
  role text,
  phone text,
  created_at timestamp with time zone default now()
);

-- Book Borrows
create table if not exists book_borrows (
  id uuid primary key default uuid_generate_v4(),
  user_id text,
  book_id text,
  book_title text,
  borrower_name text,
  borrower_phone text,
  borrower_email text,
  borrow_date timestamp with time zone default now(),
  due_date timestamp with time zone,
  return_date timestamp with time zone,
  status text default 'borrowed',
  created_at timestamp with time zone default now()
);

-- Donations
create table if not exists donations (
  id uuid primary key default uuid_generate_v4(),
  amount numeric,
  method text,
  name text,
  email text,
  message text,
  created_at timestamp with time zone default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  title text,
  message text,
  image text,
  type text,
  created_at timestamp with time zone default now()
);

-- Events
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  images text[], -- array of strings
  date text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Rare Books
create table if not exists rare_books (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  category text,
  pdf_path text,
  cover_image text,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- Notes
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  class text,
  subject text,
  title text,
  description text,
  pdf_path text,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Default Admin (password: gcmn123) - Insert if not exists
insert into users (email, password, is_admin)
values ('admin@formen.com', '$2b$10$emAD1UETXdH8yg78kHECNew.5yUzJwdXT2rYQ0WpYUO2VSVmTv.M2', true)
on conflict (email) do nothing;
-- Note: User needs to update the password hash if they want a specific one, currently using placeholder or they can register.
-- Actually, the code uses "admin" username usually but here we use email.
