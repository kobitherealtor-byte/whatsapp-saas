-- Relax legacy columns now superseded by the normalized app contract.

alter table public.whatsapp_connections
  alter column api_token_instance drop not null;

alter table public.group_campaigns
  alter column campaign_name drop not null,
  alter column allowed_days drop not null,
  alter column dispatch_time drop not null;
