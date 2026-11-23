-- Correct the readiness projection without relaxing admission or GitHub policy.
-- Preserve the existing private function identity, grants and search_path.
do $upgrade$
declare source text;before_github text;after_github text;before_pair text;after_pair text;
begin
 source:=pg_get_functiondef('private_website_lab.readiness(uuid)'::regprocedure);
 before_github:=$old$jsonb_build_object('label','GitHub organisation membership','ready',filled>=need)$old$;
 after_github:=$new$jsonb_build_object('label','GitHub organisation membership','required',(select required_for_projects from private_website_github.policy where id),'ready',not (select required_for_projects from private_website_github.policy where id) or filled>=need)$new$;
 before_pair:=$old$'Two-person agreement, if needed','ready',filled<>2 or t.two_person_reason is null$old$;
 after_pair:=$new$'Two-person agreement, if needed','ready',filled>2 or t.two_person_reason is null$new$;
 if strpos(source,before_github)=0 or strpos(source,before_pair)=0 then
  raise exception 'Unexpected readiness definition; review the current policy projection before applying this migration';
 end if;
 source:=replace(replace(source,before_github,after_github),before_pair,after_pair);
 execute source;
end $upgrade$;
