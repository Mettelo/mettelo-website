-- New outcome does not bypass the existing server-side 25-row application directory.
begin;
create temp table approval_page_results(check_name text,passed boolean);
do $$
declare staff uuid;uid uuid;iid uuid;ref text;role_name text;k integer;before_pending integer;r jsonb;p1 jsonb;p2 jsonb;p3 jsonb;
begin
 select user_id into staff from private_website_lab.member_roles where role='full_admin' limit 1;
 select project_ref,roles->>0 into ref,role_name from public.website_project_briefs order by project_ref limit 1;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 before_pending:=(public.website_project_admin_directory('list')->'metrics'->>'applications')::integer;
 for k in 1..55 loop
  uid:=gen_random_uuid();
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,'approval-page-'||uid||'@example.invalid',now(),jsonb_build_object('full_name','Approval pagination fixture '||lpad(k::text,3,'0')));
  insert into public.website_project_interests(user_id,project_ref,participation,primary_role,motivation,contribution,answers,terms_version) values(uid,ref,'team',role_name,repeat('fixture ',5),repeat('fixture ',8),'{"commitment_response":"yes"}','2026-09-03-v1') returning id into iid;
  r:=public.website_project_approval('approve',jsonb_build_object('interest_id',iid));assert r->>'placement_state'='waiting_team','Fixture did not enter formation pool';
 end loop;
 p1:=public.website_project_admin_directory('list','{"section":"applications","review":"approved","q":"Approval pagination fixture","page":1}');
 p2:=public.website_project_admin_directory('list','{"section":"applications","review":"approved","q":"Approval pagination fixture","page":2}');
 p3:=public.website_project_admin_directory('list','{"section":"applications","review":"approved","q":"Approval pagination fixture","page":3}');
 assert p1->>'total'='55' and jsonb_array_length(p1->'rows')=25 and jsonb_array_length(p2->'rows')=25 and jsonb_array_length(p3->'rows')=5,'Approved pagination is not 25/25/5';
 assert not exists(select 1 from jsonb_array_elements(p1->'rows')a join jsonb_array_elements(p2->'rows')b on a->>'id'=b->>'id'),'Application page overlap';
 r:=public.website_project_admin_directory('list','{"section":"applications","review":"approved","q":"Approval pagination fixture","page":1}');assert r->'rows'=p1->'rows','Unstable repeated page ordering';
 r:=public.website_project_admin_directory('list','{"section":"applications","review":"all","q":"Approval pagination fixture"}');assert r->>'total'='55','All applications lost approved records';
 r:=public.website_project_admin_directory('list','{"section":"applications","review":"approved","q":"Approval pagination fixture 037"}');assert r->>'total'='1','Applicant search failed';
 assert (public.website_project_admin_directory('list')->'metrics'->>'applications')::integer=before_pending,'Pending counters retained approved applications';
 insert into approval_page_results values('55 approved applicants paginate 25/25/5 with stable order, no overlap, search, All visibility and correct pending counts',true);
end $$;
select * from approval_page_results;
rollback;
