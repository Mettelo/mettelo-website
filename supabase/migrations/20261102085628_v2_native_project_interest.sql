create table public.website_project_briefs(project_ref text primary key,title text not null,roles jsonb not null,intake_open boolean not null default true);
alter table public.website_project_briefs enable row level security;
revoke all on public.website_project_briefs from anon,authenticated;
grant select on public.website_project_briefs to authenticated;
create policy website_brief_member_read on public.website_project_briefs for select to authenticated using(true);
insert into public.website_project_briefs(project_ref,title,roles) values
('MTL-DA-001','Retail Banking Customer & Portfolio Intelligence','["Data Analyst","BI Developer"]'::jsonb),
('MTL-DA-002','Student Engagement, Retention & Academic Performance Intelligence','["Data Analyst","BI Developer"]'::jsonb),
('MTL-DA-003','Energy Demand, Tariff & Customer Consumption Intelligence','["Data Analyst","BI Developer"]'::jsonb),
('MTL-DA-004','Road Safety, Collision Risk & Transport Intelligence','["Data Analyst","BI Developer","GIS / Spatial Analyst"]'::jsonb),
('MTL-DA-005','Food Safety Compliance, Inspection Risk & Regulatory Intelligence','["Data Analyst","BI Developer","Data Quality Analyst"]'::jsonb),
('MTL-DE-006','UK Road Safety Data Platform','["Data Engineer","Data Quality Analyst"]'::jsonb),
('MTL-DE-007','UK Companies Registry Data Platform','["Data Engineer","Data Quality Analyst"]'::jsonb),
('MTL-DS-008','NHS Waiting List Demand Forecasting & Capacity Planning','["Data Scientist","Data Analyst"]'::jsonb),
('MTL-DS-009','London Fire Incident Response Demand & Risk Modelling','["Data Scientist","ML Engineer","Model Governance / Assurance"]'::jsonb),
('MTL-AI-010','NHS Operational Guidance Knowledge Assistant','["AI Engineer","LLM Engineer","AI Governance / Assurance"]'::jsonb),
('MTL-XF-011','Public Procurement Spend, Supplier Concentration & Contract Risk Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst / Commercial Analyst","BI Developer","Data Quality / Assurance Analyst"]'::jsonb),
('MTL-XF-012','NHS Workforce Capacity, Retention & Service Sustainability Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Workforce / Data Analyst","BI Developer","Data Scientist / Forecaster","Model Governance / Assurance Analyst"]'::jsonb),
('MTL-XF-013','Financial Complaints, Conduct Risk & Customer Harm Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Conduct / Data Analyst","BI Developer","Risk / Assurance Analyst"]'::jsonb),
('MTL-XF-014','Telecom Customer Experience & Provider Performance Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Customer Insight / Data Analyst","BI Developer","Product Analyst","Assurance Analyst"]'::jsonb),
('MTL-XF-015','Housing Energy Efficiency, Consumption & Retrofit Prioritisation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Housing / Energy Data Analyst","BI Developer","Data Scientist","AI / Model Governance Analyst"]'::jsonb),
('MTL-XF-016','Community Safety, Crime Demand & Resource Allocation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Community Safety / Data Analyst","BI Developer","GIS / Spatial Analyst","Risk / Assurance Analyst"]'::jsonb),
('MTL-XF-017','Flood Defence Asset, Investment & Risk Prioritisation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Flood Risk / Data Analyst","GIS Analyst","BI Developer","Investment / Risk Analyst","Assurance Analyst"]'::jsonb),
('MTL-XF-018','Government Grants Portfolio, Funding Concentration & Programme Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Programme / Data Analyst","BI Developer","Evaluation Analyst","Risk / Assurance Analyst"]'::jsonb),
('MTL-XF-019','Road Network Demand, Traffic Pressure & Infrastructure Investment Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Transport / Data Analyst","GIS Analyst","BI Developer","Data Scientist","AI / Model Governance Analyst"]'::jsonb),
('MTL-XF-020','Housing Market Affordability, Development & Investment Risk Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Housing / Data Analyst","BI Developer","Economist / Policy Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-021','School Attendance, Persistent Absence & Early Intervention Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Education / Data Analyst","Policy Analyst","Assurance Analyst"]'::jsonb),
('MTL-XF-022','Statutory Homelessness, Temporary Accommodation & Prevention Performance Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Housing / Data Analyst","Policy / Evaluation Analyst","Finance Analyst"]'::jsonb),
('MTL-XF-023','Local Government Financial Resilience, Service Spend & Budget Pressure Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Finance Analyst","Risk / Assurance Analyst"]'::jsonb),
('MTL-XF-024','Apprenticeship Skills Pipeline, Participation & Achievement Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Skills / Data Analyst","Policy Analyst","Evaluation Analyst"]'::jsonb),
('MTL-XF-025','Business Insolvency, Sector Stress & Economic Resilience Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Economic / Data Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-026','Aviation Punctuality, Delay & Operational Resilience Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Aviation / Data Analyst","Operations Analyst","Data Scientist"]'::jsonb),
('MTL-XF-027','Regional Trade Exposure, Export Concentration & Market Diversification Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Trade / Economic Analyst","Policy Analyst","Risk Analyst"]'::jsonb),
('MTL-XF-028','Local Net Zero Emissions, Sector Decarbonisation & Intervention Prioritisation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Sustainability / Data Analyst","Policy Analyst","Data Scientist","AI / Model Governance Analyst"]'::jsonb),
('MTL-XF-029','NHS Hospital Activity, Demand, Flow & Capacity Pressure Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","NHS Performance Analyst","Operational Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-030','River Water Quality Classification & Environmental Intervention Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Environmental / Data Analyst","GIS Analyst","Risk / Assurance Analyst"]'::jsonb),
('MTL-XF-031','Ecommerce Conversion, Customer Journey & Optimisation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Digital Product Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-032','Retail Customer Value, Returns & Product Mix Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Retail Commercial Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-033','Bank Marketing Propensity & Campaign Efficiency Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Campaign Strategy Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-034','Credit Risk, Underwriting & Portfolio Quality Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Credit Risk Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-035','Manufacturing Predictive Maintenance & Downtime Risk Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Reliability and Maintenance Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-036','B2B Wholesale Customer Segmentation & Account Growth Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","B2B Account Strategy Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-037','Commercial Building Energy Demand & Efficiency Optimisation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Energy and Facilities Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-038','Manufacturing Quality, Defect Detection & Process Assurance Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Manufacturing Quality Analyst","Data Scientist","Model Governance / Assurance"]'::jsonb),
('MTL-XF-039','Enterprise Vulnerability Exposure & Patch Prioritisation Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","Vulnerability Management Analyst","Cyber Risk Analyst","Security Assurance Analyst"]'::jsonb),
('MTL-XF-040','Phishing URL Detection & Security Triage Intelligence','["Business Analyst","Data Governance Analyst","Data Engineer","Data Analyst","BI Developer","SOC Analyst","Threat Intelligence Analyst","Data Scientist","Security Governance Analyst","Model Governance / Assurance"]'::jsonb),
('MTL-BA-041','Customer Returns & Refund Process Improvement','["Business Analyst","Process Improvement Business Analyst"]'::jsonb),
('MTL-BA-042','NHS Outpatient Referral & Appointment Discovery','["Business Analyst","Service Business Analyst"]'::jsonb),
('MTL-BA-043','SME Lending Functional Requirements & Decision Rules','["Business Analyst","Functional Business Analyst"]'::jsonb),
('MTL-BA-044','Employee Onboarding & Access Integration Analysis','["Business Analyst","Technical Business Analyst"]'::jsonb),
('MTL-BA-045','CRM & Sales Pipeline Agile Product Analysis','["Business Analyst","Agile Business Analyst"]'::jsonb),
('MTL-AI-046','Data Quality Investigation Copilot','["AI Engineer","Data Engineer","Data Quality Analyst","AI Governance / Assurance"]'::jsonb),
('MTL-AI-047','Mobility Operations Narrative Copilot','["AI Engineer","Data Analyst","Analytics Engineer","AI Governance / Assurance"]'::jsonb),
('MTL-AI-048','Meeting Decision & Action Copilot','["AI Engineer","NLP / Data Engineer","Product / Business Analyst","AI Governance / Assurance"]'::jsonb),
('MTL-AI-049','SOC Incident Investigation Copilot','["AI Engineer","SOC Analyst","Security Data Engineer","Threat / Detection Analyst","Security Assurance Analyst"]'::jsonb),
('MTL-AI-050','Cybersecurity Framework Change Intelligence Assistant','["AI Engineer","Cybersecurity Governance Analyst","Data / Document Engineer","Risk / Control Analyst","AI Governance / Assurance"]'::jsonb);
create table public.website_project_interests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 project_ref text not null references public.website_project_briefs(project_ref),
 participation text not null check(participation in ('solo','team','flexible')),
 primary_role text,
 motivation text not null check(length(motivation) between 20 and 2000),
 contribution text not null check(length(contribution) between 40 and 3000),
 answers jsonb not null check(jsonb_typeof(answers)='object'),
 terms_version text not null check(terms_version='2026-09-03-v1'),
 terms_accepted_at timestamptz not null default now(),
 submitted_at timestamptz not null default now(),
 unique(user_id,project_ref),
 check(participation<>'team' or primary_role is not null)
);
alter table public.website_project_interests enable row level security;
revoke all on public.website_project_interests from anon,authenticated;
grant select,insert on public.website_project_interests to authenticated;
create policy website_interest_owner_read on public.website_project_interests for select to authenticated using((select auth.uid())=user_id);
create policy website_interest_owner_submit on public.website_project_interests for insert to authenticated with check(
 (select auth.uid())=user_id and exists(select 1 from public.website_project_briefs b where b.project_ref=website_project_interests.project_ref and b.intake_open
 and (website_project_interests.primary_role is null or b.roles ? website_project_interests.primary_role)));
create index website_interest_project on public.website_project_interests(project_ref);
