-- Keep draft-title search counts consistent with the paginated rows.
create or replace function private_website_content.admin(a text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();k text:=p->>'key';doc private_website_content.documents;rev private_website_content.revisions;data jsonb;expected bigint;pg integer:=greatest(1,least(100000,coalesce((p->>'page')::integer,1)));q text:=left(coalesce(p->>'q',''),150);total integer;note text:=left(btrim(coalesce(p->>'note','')),500);
begin
 if not private_website_lab.permitted(actor,case when a='list_projects' or (a in ('get','save','publish','restore') and k like 'project:%') then 'operations' else 'roles' end) then raise exception 'Authorised website administrator required' using errcode='42501';end if;
 if a='list_projects' then
  select count(*) into total from public.website_project_briefs b left join private_website_content.documents d on d.key='project:'||b.project_ref where q='' or concat_ws(' ',b.project_ref,b.title,d.draft->>'title') ilike '%'||q||'%';
  return jsonb_build_object('page',pg,'page_size',25,'total',total,'rows',coalesce((select jsonb_agg(to_jsonb(x)) from(select b.project_ref,coalesce(d.published->>'title',b.title) title,d.version,d.published_at,d.updated_at,d.draft is distinct from d.published has_draft from public.website_project_briefs b left join private_website_content.documents d on d.key='project:'||b.project_ref where q='' or concat_ws(' ',b.project_ref,b.title,d.draft->>'title') ilike '%'||q||'%' order by b.project_ref limit 25 offset (pg-1)*25)x),'[]'));
 elsif a='list_pages' then return coalesce((select jsonb_agg(jsonb_build_object('key',key,'label',label,'version',version,'published_at',published_at,'has_draft',draft is distinct from published) order by key) from private_website_content.documents where kind<>'project'),'[]');end if;
 if k is null or k !~ '^(project:MTL-[A-Z0-9-]+|page:(home|about)|brand:defaults)$' then raise exception 'Content not found';end if;
 perform pg_advisory_xact_lock(hashtextextended('website-content:'||k,0));
 if k like 'project:%' and not exists(select 1 from private_website_content.documents where key=k) then
  insert into private_website_content.documents(key,kind,label,draft,published,published_at)
  select k,'project',b.title,j.data,j.data,now() from public.website_project_briefs b join private_website_lab.market_proposals mp on mp.project_ref=b.project_ref and mp.state='approved' cross join lateral(select jsonb_build_object('title',b.title,'category',mp.category,'description',mp.description,'problem',mp.problem,'outcome',mp.outcome,'milestones',mp.milestones,'skills',array_to_string(array(select jsonb_array_elements_text(mp.skills)),', '),'commitment',mp.commitment,'repository',mp.supporting_url,'collaboration',mp.collaboration,'roles',b.roles,'seo_title',b.title||' | Mettelo','seo_description',left(mp.description,300),'share_title',b.title,'share_description',left(mp.description,500),'share_image','','share_image_alt','') data)j where b.project_ref=substring(k from 9) on conflict do nothing;
 end if;
 select * into doc from private_website_content.documents where key=k for update;
 if not found then raise exception 'Content not found';end if;
 if a='get' then return to_jsonb(doc)||jsonb_build_object('revisions',coalesce((select jsonb_agg(to_jsonb(x)) from(select rr.id,rr.version,rr.action,rr.note,rr.created_at,rr.snapshot from private_website_content.revisions rr where rr.document_key=k order by rr.version desc limit 30)x),'[]'));end if;
 expected:=(p->>'expected_version')::bigint;
 if expected is null or expected<>doc.version then raise exception 'This content changed. Reload before saving to avoid overwriting another administrator.' using errcode='40001';end if;
 if a='save' then data:=p->'data';
 elsif a='restore' then select * into rev from private_website_content.revisions where id=(p->>'revision_id')::uuid and document_key=k;if not found then raise exception 'Revision not found';end if;data:=rev.snapshot;
 elsif a='publish' then
  if p->>'confirmed' is distinct from 'true' or length(note)<8 then raise exception 'Review the preview and describe the change before publishing';end if;
  data:=doc.draft;
 else raise exception 'Unsupported content action';end if;
 perform private_website_content.validate(k,data);
 if doc.kind='project' and data->'roles' is distinct from doc.published->'roles' then raise exception 'Manage placement roles in Project teams; brief editing cannot change member responsibilities';end if;
 if not exists(select 1 from private_website_content.revisions where document_key=k) then insert into private_website_content.revisions(document_key,actor_id,version,action,snapshot,note) values(k,actor,doc.version,'save',doc.draft,'Starting version before editing');end if;
 insert into private_website_content.revisions(document_key,actor_id,version,action,snapshot,note) values(k,actor,doc.version+1,a,data,note);
 update private_website_content.documents set draft=data,published=case when a='publish' then data else published end,published_at=case when a='publish' then now() else published_at end,version=version+1,updated_by=actor,updated_at=now() where key=k;
 if a='publish' and doc.kind='project' then update public.website_project_briefs set title=data->>'title' where project_ref=substring(k from 9);end if;
 return jsonb_build_object('ok',true,'key',k,'version',doc.version+1);
end $$;
