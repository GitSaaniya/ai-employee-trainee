-- SkillSim AI reference schema (optional future Supabase migration)
-- Not required to run the local mock MVP.

create table organisations (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id text primary key,
  organisation_id text references organisations(id),
  email text unique not null,
  name text not null,
  role text check (role in ('admin', 'employee')) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table departments (
  id text primary key,
  organisation_id text references organisations(id),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id text primary key,
  organisation_id text references organisations(id),
  department_id text references departments(id),
  name text not null,
  description text,
  seniority_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table competencies (
  id text primary key,
  organisation_id text references organisations(id),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table role_competencies (
  id text primary key,
  role_id text references roles(id),
  competency_id text references competencies(id),
  weight numeric not null,
  expected_proficiency numeric not null
);

create table employee_profiles (
  id text primary key,
  user_id text references users(id),
  organisation_id text references organisations(id),
  role_id text references roles(id),
  department_id text references departments(id),
  readiness_score numeric,
  previous_score numeric,
  risk_level text,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table simulations (
  id text primary key,
  organisation_id text references organisations(id),
  title text not null,
  status text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assignments (
  id text primary key,
  organisation_id text references organisations(id),
  simulation_id text references simulations(id),
  status text,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table simulation_attempts (
  id text primary key,
  organisation_id text references organisations(id),
  assignment_id text references assignments(id),
  employee_id text references employee_profiles(id),
  status text,
  overall_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table feedback_reports (
  id text primary key,
  attempt_id text references simulation_attempts(id),
  employee_id text references employee_profiles(id),
  organisation_id text references organisations(id),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table improvement_plans (
  id text primary key,
  organisation_id text references organisations(id),
  employee_id text references employee_profiles(id),
  attempt_id text references simulation_attempts(id),
  status text,
  ai_generated boolean default true,
  reviewed_by_admin boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table integrations (
  id text primary key,
  name text not null,
  category text,
  status text,
  description text
);

-- Example RLS intent:
-- Admins: select/update organisation-scoped rows where users.role = 'admin'
-- Employees: select only own assignments, attempts, reports, and plans
