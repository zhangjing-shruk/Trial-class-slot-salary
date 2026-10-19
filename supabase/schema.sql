-- Supabase 正式接入准备稿。默认拒绝浏览器匿名访问，待确定两位运营的访问方式后接入。
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  gender text not null,
  subject text not null,
  source jsonb,
  pay_mode text not null default 'slot' check (pay_mode in ('slot','hourly')),
  currency text check (currency in ('EGP', 'JOD')),
  hourly_rate numeric(12,3) check (hourly_rate > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.schedule_versions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id),
  effective_date date not null,
  unique (teacher_id, effective_date)
);
create table if not exists public.schedule_ranges (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.schedule_versions(id),
  weekday integer not null check (weekday between 0 and 6),
  start_minute integer not null check (start_minute between 0 and 1410 and start_minute % 30 = 0),
  end_minute integer not null check (end_minute between 30 and 1440 and end_minute % 30 = 0),
  check (end_minute > start_minute)
);
create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id),
  local_date date not null,
  completed integer not null check (completed >= 0),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (teacher_id, local_date)
);
create table if not exists public.time_exceptions (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records(id),
  kind text not null check (kind in ('add','leave','late','absent','other')),
  start_minute integer not null check (start_minute between 0 and 1410 and start_minute % 30 = 0),
  end_minute integer not null check (end_minute between 30 and 1440 and end_minute % 30 = 0),
  reason text not null check (length(trim(reason)) > 0),
  check (end_minute > start_minute)
);
create table if not exists public.pay_adjustments (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records(id),
  amount numeric(12,3) not null check (amount <> 0),
  reason text not null check (length(trim(reason)) > 0)
);
alter table public.teachers enable row level security;
alter table public.schedule_versions enable row level security;
alter table public.schedule_ranges enable row level security;
alter table public.daily_records enable row level security;
alter table public.time_exceptions enable row level security;
alter table public.pay_adjustments enable row level security;
-- 无公开访问策略。不要添加允许任意匿名用户读写工资数据的策略。
-- 正式服务端需要验证运营访问权限、重新计算工资并以事务保存每日记录/异常/调整。
-- revision 用于并发更新检测，防止两位运营覆盖彼此的数据。

-- 指定日期排班：存在记录时替换当天固定模板，ranges=[] 表示当天不开放。
create table if not exists public.date_schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id),
  local_date date not null,
  ranges jsonb not null default '[]'::jsonb check (jsonb_typeof(ranges) = 'array'),
  reason text not null check (length(trim(reason)) > 0),
  unique (teacher_id, local_date)
);
alter table public.date_schedules enable row level security;
-- 服务端需校验 ranges 的整点/半点、先后顺序、无重叠及已录入工资日期限制。

-- 兼容已运行旧准备稿的数据库（尚未连接正式数据）。
alter table public.teachers add column if not exists pay_mode text not null default 'slot' check (pay_mode in ('slot','hourly'));
