-- =========================================================
-- Passage Monitor - 재생 기록(녹음 하나의 재생 흐름) 조회 함수 (TASK-002)
--
-- monitor_playback_admin.sql 다음에 SQL Editor에서 통째로 실행하세요.
-- 여러 번 실행해도 안전합니다.
--
-- 이 스크립트가 하는 일:
--   monitor_playback_timeline(): 관리자만 부를 수 있다. 녹음(게시글) 하나와
--   기간을 받아, 그 녹음의 재생마다 판단 값과 재생 흐름 이벤트를 돌려준다.
--     sessions: playback_session_facts() 중 그 녹음의 재생. 들은 사람은
--               가명 listener_id 와 닉네임(profiles.username)으로 나온다.
--               계정 id·이메일은 넘기지 않는다. 닉네임이 없으면 null,
--               탈퇴해 계정 연결이 끊겼으면 account_exists = false.
--     events:   그 재생들의 이벤트(재생·일시정지·이어 듣기·위치 이동·
--               끝까지 들음·멈춤)와 그 재생이 있었던 방문의 들어옴·나감.
--               "듣는 중"(progress)은 재생마다 마지막 1건만.
--   셀지 뺄지 규칙은 적용하지 않는다(대시보드 src/lib/playback.ts 가 한다).
--
-- 기존 Passage 테이블·함수·정책은 바꾸지 않는다.
-- =========================================================

begin;

create or replace function public.monitor_playback_timeline(
  p_post_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_sessions jsonb;
  v_playback_ids uuid[];
  v_visit_ids uuid[];
  v_events jsonb;
begin
  if not public.is_monitor_admin() then
    raise exception 'monitor admin only'
      using errcode = '42501';
  end if;

  if p_post_id is null or p_from is null or p_to is null or p_to <= p_from then
    raise exception 'p_post_id, p_from and p_to are required (p_from < p_to)'
      using errcode = '22023';
  end if;

  if p_to - p_from > interval '93 days' then
    raise exception 'period must be 93 days or less'
      using errcode = '22023';
  end if;

  with f as (
    select *
    from public.playback_session_facts(p_from, p_to) x
    where x.post_id = p_post_id
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'playback_id', f.playback_id,
      'listener_id', f.listener_id,
      'nickname', pr.username,
      'account_exists', pl.user_id is not null,
      'visit_id', f.visit_id,
      'visit_post_id', f.visit_post_id,
      'post_id', f.post_id,
      'song_id', f.song_key_for_count,
      'song_title', coalesce(s.title, f.song_title_at_receipt),
      'artist', coalesce(s.artist, f.artist_at_receipt),
      'is_own', f.is_own,
      'source', f.source,
      'started_at', f.started_at,
      'ended_at', f.ended_at,
      'end_type', f.end_type,
      'prev_relation', f.prev_relation,
      'prev_end_type', f.prev_end_type,
      'gap_start_to_start_ms', f.gap_start_to_start_ms,
      'gap_end_to_start_ms', f.gap_end_to_start_ms,
      'gap_exit_to_reenter_ms', f.gap_exit_to_reenter_ms
    ) order by f.started_at, f.playback_id), '[]'::jsonb),
    coalesce(array_agg(f.playback_id), '{}'),
    coalesce(array_agg(distinct f.visit_id), '{}')
  into v_sessions, v_playback_ids, v_visit_ids
  from f
  left join public.songs s
    on s.song_id = f.song_key_for_count
  left join public.playback_listeners pl
    on pl.listener_id = f.listener_id
  left join public.profiles pr
    on pr.user_id = pl.user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'event_type', e.event_type,
      'occurred_at', e.occurred_at,
      'visit_id', e.visit_id,
      'playback_id', e.playback_id,
      'post_id', e.post_id,
      'position_ms', e.position_ms,
      'seek_from_ms', e.seek_from_ms
    ) order by e.occurred_at, e.client_seq nulls last), '[]'::jsonb)
  into v_events
  from (
    select
      pe.*,
      row_number() over (
        partition by pe.playback_id, pe.event_type = 'progress'
        order by pe.occurred_at desc
      ) as rn
    from public.playback_events pe
    where pe.playback_id = any (v_playback_ids)
       or (pe.event_type in ('visit_enter', 'visit_exit') and pe.visit_id = any (v_visit_ids))
  ) e
  where e.event_type <> 'progress' or e.rn = 1;

  return jsonb_build_object('sessions', v_sessions, 'events', v_events);
end;
$function$;

revoke all
on function public.monitor_playback_timeline(uuid, timestamptz, timestamptz)
from public, anon;

grant execute
on function public.monitor_playback_timeline(uuid, timestamptz, timestamptz)
to authenticated;

commit;

-- 새 함수를 API가 바로 인식하도록 스키마 캐시를 다시 읽게 한다.
notify pgrst, 'reload schema';



-- =========================================================
-- 적용 후 확인 (데이터를 바꾸지 않는 조회만, SQL Editor에서)
-- =========================================================
-- 1) 앱 역할 권한: anon 은 false, authenticated 는 true 여야 한다(관리자 확인은 함수 안에서).
--   select r.role,
--          has_function_privilege(r.role, 'public.monitor_playback_timeline(uuid, timestamptz, timestamptz)', 'execute')
--   from (values ('anon'), ('authenticated')) as r(role);
-- 2) SQL Editor 에서 직접 부르면 auth.uid() 가 없어 42501 로 거부되는 것이 정상이다.
