-- Cota do mapa público: 2 buscas grátis por dia (America/Sao_Paulo), por IP + dispositivo.
-- Rode no SQL Editor: https://supabase.com/dashboard/project/zbjhaupxhriedfsgtlbj/sql/new

create extension if not exists pgcrypto;

create table if not exists public.mapa_publico_cotas (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  device_id text not null,
  dia date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mapa_publico_cotas_dia_ip
  on public.mapa_publico_cotas (dia, ip_hash);

create index if not exists idx_mapa_publico_cotas_dia_device
  on public.mapa_publico_cotas (dia, device_id);

alter table public.mapa_publico_cotas enable row level security;

revoke all on table public.mapa_publico_cotas from public, anon, authenticated;

create or replace function public.mapa_publico_cota_estado(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_headers json;
  v_ip text;
  v_ip_hash text;
  v_device text;
  v_dia date;
  v_usadas int;
  v_limite int := 2;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  exception when others then
    v_headers := '{}'::json;
  end;
  v_ip := trim(both from coalesce(
    nullif(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1), ''),
    nullif(v_headers->>'cf-connecting-ip', ''),
    nullif(v_headers->>'x-real-ip', ''),
    nullif(v_headers->>'x-client-ip', ''),
    'desconhecido'
  ));
  v_ip_hash := encode(digest(convert_to(v_ip, 'UTF8'), 'sha256'), 'hex');
  v_device := left(regexp_replace(coalesce(p_device_id, ''), '[^a-zA-Z0-9_-]', '', 'g'), 64);
  if length(v_device) < 8 then
    v_device := 'anon';
  end if;
  v_dia := (timezone('America/Sao_Paulo', now()))::date;

  select count(*)::int into v_usadas
  from public.mapa_publico_cotas
  where dia = v_dia
    and (ip_hash = v_ip_hash or device_id = v_device);

  v_usadas := least(v_limite, greatest(0, v_usadas));
  return jsonb_build_object(
    'usadas', v_usadas,
    'restam', greatest(0, v_limite - v_usadas),
    'esgotado', v_usadas >= v_limite,
    'limite', v_limite
  );
end;
$$;

create or replace function public.mapa_publico_cota_consumir(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_headers json;
  v_ip text;
  v_ip_hash text;
  v_device text;
  v_dia date;
  v_usadas int;
  v_limite int := 2;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  exception when others then
    v_headers := '{}'::json;
  end;
  v_ip := trim(both from coalesce(
    nullif(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1), ''),
    nullif(v_headers->>'cf-connecting-ip', ''),
    nullif(v_headers->>'x-real-ip', ''),
    nullif(v_headers->>'x-client-ip', ''),
    'desconhecido'
  ));
  v_ip_hash := encode(digest(convert_to(v_ip, 'UTF8'), 'sha256'), 'hex');
  v_device := left(regexp_replace(coalesce(p_device_id, ''), '[^a-zA-Z0-9_-]', '', 'g'), 64);
  if length(v_device) < 8 then
    v_device := 'anon';
  end if;
  v_dia := (timezone('America/Sao_Paulo', now()))::date;

  perform pg_advisory_xact_lock(881122, hashtext(v_ip_hash));

  select count(*)::int into v_usadas
  from public.mapa_publico_cotas
  where dia = v_dia
    and (ip_hash = v_ip_hash or device_id = v_device);

  if v_usadas >= v_limite then
    return jsonb_build_object(
      'ok', false,
      'usadas', v_limite,
      'restam', 0,
      'esgotado', true,
      'limite', v_limite
    );
  end if;

  insert into public.mapa_publico_cotas (ip_hash, device_id, dia)
  values (v_ip_hash, v_device, v_dia);

  v_usadas := v_usadas + 1;
  return jsonb_build_object(
    'ok', true,
    'usadas', v_usadas,
    'restam', greatest(0, v_limite - v_usadas),
    'esgotado', v_usadas >= v_limite,
    'limite', v_limite
  );
end;
$$;

revoke all on function public.mapa_publico_cota_estado(text) from public;
revoke all on function public.mapa_publico_cota_consumir(text) from public;
grant execute on function public.mapa_publico_cota_estado(text) to anon, authenticated;
grant execute on function public.mapa_publico_cota_consumir(text) to anon, authenticated;

notify pgrst, 'reload schema';
