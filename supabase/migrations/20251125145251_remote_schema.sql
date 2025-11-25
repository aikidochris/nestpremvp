drop extension if exists "pg_net";


  create table "public"."admin_events" (
    "id" uuid not null default gen_random_uuid(),
    "admin_id" uuid not null,
    "action" text not null,
    "payload" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."admin_events" enable row level security;


  create table "public"."ai_queries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "input_text" text,
    "output_text" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_queries" enable row level security;


  create table "public"."analytics_events" (
    "id" uuid not null default gen_random_uuid(),
    "event_name" text not null,
    "user_id" uuid,
    "property_id" uuid,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."analytics_events" enable row level security;


  create table "public"."home_comments" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "user_id" uuid not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default now(),
    "parent_id" uuid
      );



  create table "public"."home_story" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "summary_text" text,
    "images" text[],
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."home_story" enable row level security;


  create table "public"."intent_flags" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "owner_id" uuid not null,
    "soft_listing" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."intent_flags" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "thread_id" uuid not null,
    "sender_id" uuid not null,
    "receiver_id" uuid not null,
    "property_id" uuid,
    "content" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "display_name" text,
    "avatar_url" text,
    "role" text not null default 'user'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."properties" (
    "id" uuid not null default gen_random_uuid(),
    "uprn" text,
    "postcode" text,
    "street" text,
    "house_number" text,
    "lat" double precision not null,
    "lon" double precision not null,
    "price_estimate" numeric,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."properties" enable row level security;


  create table "public"."property_claims" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "user_id" uuid not null,
    "status" text not null default 'claimed'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."property_claims" enable row level security;


  create table "public"."property_inbox" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "sender_id" uuid not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."property_inbox" enable row level security;


  create table "public"."service_intents" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "property_id" uuid,
    "service_type" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."service_intents" enable row level security;

CREATE UNIQUE INDEX admin_events_pkey ON public.admin_events USING btree (id);

CREATE UNIQUE INDEX ai_queries_pkey ON public.ai_queries USING btree (id);

CREATE UNIQUE INDEX analytics_events_pkey ON public.analytics_events USING btree (id);

CREATE UNIQUE INDEX home_comments_pkey ON public.home_comments USING btree (id);

CREATE UNIQUE INDEX home_story_pkey ON public.home_story USING btree (id);

CREATE UNIQUE INDEX home_story_property_id_key ON public.home_story USING btree (property_id);

CREATE INDEX idx_admin_events_admin_id ON public.admin_events USING btree (admin_id);

CREATE INDEX idx_ai_queries_user_id ON public.ai_queries USING btree (user_id);

CREATE INDEX idx_analytics_events_event_name ON public.analytics_events USING btree (event_name);

CREATE INDEX idx_analytics_events_property_id ON public.analytics_events USING btree (property_id);

CREATE INDEX idx_analytics_events_user_id ON public.analytics_events USING btree (user_id);

CREATE INDEX idx_messages_receiver_id ON public.messages USING btree (receiver_id);

CREATE INDEX idx_messages_thread_id ON public.messages USING btree (thread_id);

CREATE INDEX idx_properties_lat_lon ON public.properties USING btree (lat, lon);

CREATE INDEX idx_properties_postcode ON public.properties USING btree (postcode);

CREATE INDEX idx_service_intents_user_id ON public.service_intents USING btree (user_id);

CREATE UNIQUE INDEX intent_flags_pkey ON public.intent_flags USING btree (id);

CREATE UNIQUE INDEX intent_flags_property_id_key ON public.intent_flags USING btree (property_id);

CREATE UNIQUE INDEX intent_flags_property_owner_unique ON public.intent_flags USING btree (property_id, owner_id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX properties_pkey ON public.properties USING btree (id);

CREATE UNIQUE INDEX property_claims_pkey ON public.property_claims USING btree (id);

CREATE UNIQUE INDEX property_inbox_pkey ON public.property_inbox USING btree (id);

CREATE UNIQUE INDEX service_intents_pkey ON public.service_intents USING btree (id);

CREATE UNIQUE INDEX uq_home_story_property ON public.home_story USING btree (property_id);

CREATE UNIQUE INDEX uq_property_claims_property_only ON public.property_claims USING btree (property_id);

CREATE UNIQUE INDEX uq_property_claims_property_user ON public.property_claims USING btree (property_id, user_id);

alter table "public"."admin_events" add constraint "admin_events_pkey" PRIMARY KEY using index "admin_events_pkey";

alter table "public"."ai_queries" add constraint "ai_queries_pkey" PRIMARY KEY using index "ai_queries_pkey";

alter table "public"."analytics_events" add constraint "analytics_events_pkey" PRIMARY KEY using index "analytics_events_pkey";

alter table "public"."home_comments" add constraint "home_comments_pkey" PRIMARY KEY using index "home_comments_pkey";

alter table "public"."home_story" add constraint "home_story_pkey" PRIMARY KEY using index "home_story_pkey";

alter table "public"."intent_flags" add constraint "intent_flags_pkey" PRIMARY KEY using index "intent_flags_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."properties" add constraint "properties_pkey" PRIMARY KEY using index "properties_pkey";

alter table "public"."property_claims" add constraint "property_claims_pkey" PRIMARY KEY using index "property_claims_pkey";

alter table "public"."property_inbox" add constraint "property_inbox_pkey" PRIMARY KEY using index "property_inbox_pkey";

alter table "public"."service_intents" add constraint "service_intents_pkey" PRIMARY KEY using index "service_intents_pkey";

alter table "public"."admin_events" add constraint "admin_events_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_events" validate constraint "admin_events_admin_id_fkey";

alter table "public"."ai_queries" add constraint "ai_queries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ai_queries" validate constraint "ai_queries_user_id_fkey";

alter table "public"."home_comments" add constraint "home_comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.home_comments(id) ON DELETE CASCADE not valid;

alter table "public"."home_comments" validate constraint "home_comments_parent_id_fkey";

alter table "public"."home_comments" add constraint "home_comments_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE not valid;

alter table "public"."home_comments" validate constraint "home_comments_property_id_fkey";

alter table "public"."home_comments" add constraint "home_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."home_comments" validate constraint "home_comments_user_id_fkey";

alter table "public"."home_story" add constraint "home_story_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE not valid;

alter table "public"."home_story" validate constraint "home_story_property_id_fkey";

alter table "public"."home_story" add constraint "home_story_property_id_key" UNIQUE using index "home_story_property_id_key";

alter table "public"."intent_flags" add constraint "intent_flags_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."intent_flags" validate constraint "intent_flags_owner_id_fkey";

alter table "public"."intent_flags" add constraint "intent_flags_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE not valid;

alter table "public"."intent_flags" validate constraint "intent_flags_property_id_fkey";

alter table "public"."intent_flags" add constraint "intent_flags_property_id_key" UNIQUE using index "intent_flags_property_id_key";

alter table "public"."intent_flags" add constraint "intent_flags_property_owner_unique" UNIQUE using index "intent_flags_property_owner_unique";

alter table "public"."messages" add constraint "messages_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL not valid;

alter table "public"."messages" validate constraint "messages_property_id_fkey";

alter table "public"."messages" add constraint "messages_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_receiver_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."property_claims" add constraint "property_claims_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE not valid;

alter table "public"."property_claims" validate constraint "property_claims_property_id_fkey";

alter table "public"."property_claims" add constraint "property_claims_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."property_claims" validate constraint "property_claims_user_id_fkey";

alter table "public"."property_inbox" add constraint "property_inbox_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE not valid;

alter table "public"."property_inbox" validate constraint "property_inbox_property_id_fkey";

alter table "public"."property_inbox" add constraint "property_inbox_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."property_inbox" validate constraint "property_inbox_sender_id_fkey";

alter table "public"."service_intents" add constraint "service_intents_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL not valid;

alter table "public"."service_intents" validate constraint "service_intents_property_id_fkey";

alter table "public"."service_intents" add constraint "service_intents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."service_intents" validate constraint "service_intents_user_id_fkey";

create or replace view "public"."property_public_view" as  SELECT p.id AS property_id,
    p.lat,
    p.lon,
    pc.user_id AS claimed_by_user_id,
    (pc.user_id IS NOT NULL) AS is_claimed,
    COALESCE(ifl.soft_listing, false) AS is_open_to_talking,
    false AS is_for_sale,
    false AS is_for_rent,
    false AS has_recent_activity
   FROM ((public.properties p
     LEFT JOIN public.property_claims pc ON ((pc.property_id = p.id)))
     LEFT JOIN public.intent_flags ifl ON ((ifl.property_id = p.id)));


grant delete on table "public"."admin_events" to "anon";

grant insert on table "public"."admin_events" to "anon";

grant references on table "public"."admin_events" to "anon";

grant select on table "public"."admin_events" to "anon";

grant trigger on table "public"."admin_events" to "anon";

grant truncate on table "public"."admin_events" to "anon";

grant update on table "public"."admin_events" to "anon";

grant delete on table "public"."admin_events" to "authenticated";

grant insert on table "public"."admin_events" to "authenticated";

grant references on table "public"."admin_events" to "authenticated";

grant select on table "public"."admin_events" to "authenticated";

grant trigger on table "public"."admin_events" to "authenticated";

grant truncate on table "public"."admin_events" to "authenticated";

grant update on table "public"."admin_events" to "authenticated";

grant delete on table "public"."admin_events" to "service_role";

grant insert on table "public"."admin_events" to "service_role";

grant references on table "public"."admin_events" to "service_role";

grant select on table "public"."admin_events" to "service_role";

grant trigger on table "public"."admin_events" to "service_role";

grant truncate on table "public"."admin_events" to "service_role";

grant update on table "public"."admin_events" to "service_role";

grant delete on table "public"."ai_queries" to "anon";

grant insert on table "public"."ai_queries" to "anon";

grant references on table "public"."ai_queries" to "anon";

grant select on table "public"."ai_queries" to "anon";

grant trigger on table "public"."ai_queries" to "anon";

grant truncate on table "public"."ai_queries" to "anon";

grant update on table "public"."ai_queries" to "anon";

grant delete on table "public"."ai_queries" to "authenticated";

grant insert on table "public"."ai_queries" to "authenticated";

grant references on table "public"."ai_queries" to "authenticated";

grant select on table "public"."ai_queries" to "authenticated";

grant trigger on table "public"."ai_queries" to "authenticated";

grant truncate on table "public"."ai_queries" to "authenticated";

grant update on table "public"."ai_queries" to "authenticated";

grant delete on table "public"."ai_queries" to "service_role";

grant insert on table "public"."ai_queries" to "service_role";

grant references on table "public"."ai_queries" to "service_role";

grant select on table "public"."ai_queries" to "service_role";

grant trigger on table "public"."ai_queries" to "service_role";

grant truncate on table "public"."ai_queries" to "service_role";

grant update on table "public"."ai_queries" to "service_role";

grant delete on table "public"."analytics_events" to "anon";

grant insert on table "public"."analytics_events" to "anon";

grant references on table "public"."analytics_events" to "anon";

grant select on table "public"."analytics_events" to "anon";

grant trigger on table "public"."analytics_events" to "anon";

grant truncate on table "public"."analytics_events" to "anon";

grant update on table "public"."analytics_events" to "anon";

grant delete on table "public"."analytics_events" to "authenticated";

grant insert on table "public"."analytics_events" to "authenticated";

grant references on table "public"."analytics_events" to "authenticated";

grant select on table "public"."analytics_events" to "authenticated";

grant trigger on table "public"."analytics_events" to "authenticated";

grant truncate on table "public"."analytics_events" to "authenticated";

grant update on table "public"."analytics_events" to "authenticated";

grant delete on table "public"."analytics_events" to "service_role";

grant insert on table "public"."analytics_events" to "service_role";

grant references on table "public"."analytics_events" to "service_role";

grant select on table "public"."analytics_events" to "service_role";

grant trigger on table "public"."analytics_events" to "service_role";

grant truncate on table "public"."analytics_events" to "service_role";

grant update on table "public"."analytics_events" to "service_role";

grant delete on table "public"."home_comments" to "anon";

grant insert on table "public"."home_comments" to "anon";

grant references on table "public"."home_comments" to "anon";

grant select on table "public"."home_comments" to "anon";

grant trigger on table "public"."home_comments" to "anon";

grant truncate on table "public"."home_comments" to "anon";

grant update on table "public"."home_comments" to "anon";

grant delete on table "public"."home_comments" to "authenticated";

grant insert on table "public"."home_comments" to "authenticated";

grant references on table "public"."home_comments" to "authenticated";

grant select on table "public"."home_comments" to "authenticated";

grant trigger on table "public"."home_comments" to "authenticated";

grant truncate on table "public"."home_comments" to "authenticated";

grant update on table "public"."home_comments" to "authenticated";

grant delete on table "public"."home_comments" to "service_role";

grant insert on table "public"."home_comments" to "service_role";

grant references on table "public"."home_comments" to "service_role";

grant select on table "public"."home_comments" to "service_role";

grant trigger on table "public"."home_comments" to "service_role";

grant truncate on table "public"."home_comments" to "service_role";

grant update on table "public"."home_comments" to "service_role";

grant delete on table "public"."home_story" to "anon";

grant insert on table "public"."home_story" to "anon";

grant references on table "public"."home_story" to "anon";

grant select on table "public"."home_story" to "anon";

grant trigger on table "public"."home_story" to "anon";

grant truncate on table "public"."home_story" to "anon";

grant update on table "public"."home_story" to "anon";

grant delete on table "public"."home_story" to "authenticated";

grant insert on table "public"."home_story" to "authenticated";

grant references on table "public"."home_story" to "authenticated";

grant select on table "public"."home_story" to "authenticated";

grant trigger on table "public"."home_story" to "authenticated";

grant truncate on table "public"."home_story" to "authenticated";

grant update on table "public"."home_story" to "authenticated";

grant delete on table "public"."home_story" to "service_role";

grant insert on table "public"."home_story" to "service_role";

grant references on table "public"."home_story" to "service_role";

grant select on table "public"."home_story" to "service_role";

grant trigger on table "public"."home_story" to "service_role";

grant truncate on table "public"."home_story" to "service_role";

grant update on table "public"."home_story" to "service_role";

grant delete on table "public"."intent_flags" to "anon";

grant insert on table "public"."intent_flags" to "anon";

grant references on table "public"."intent_flags" to "anon";

grant select on table "public"."intent_flags" to "anon";

grant trigger on table "public"."intent_flags" to "anon";

grant truncate on table "public"."intent_flags" to "anon";

grant update on table "public"."intent_flags" to "anon";

grant delete on table "public"."intent_flags" to "authenticated";

grant insert on table "public"."intent_flags" to "authenticated";

grant references on table "public"."intent_flags" to "authenticated";

grant select on table "public"."intent_flags" to "authenticated";

grant trigger on table "public"."intent_flags" to "authenticated";

grant truncate on table "public"."intent_flags" to "authenticated";

grant update on table "public"."intent_flags" to "authenticated";

grant delete on table "public"."intent_flags" to "service_role";

grant insert on table "public"."intent_flags" to "service_role";

grant references on table "public"."intent_flags" to "service_role";

grant select on table "public"."intent_flags" to "service_role";

grant trigger on table "public"."intent_flags" to "service_role";

grant truncate on table "public"."intent_flags" to "service_role";

grant update on table "public"."intent_flags" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."properties" to "anon";

grant insert on table "public"."properties" to "anon";

grant references on table "public"."properties" to "anon";

grant select on table "public"."properties" to "anon";

grant trigger on table "public"."properties" to "anon";

grant truncate on table "public"."properties" to "anon";

grant update on table "public"."properties" to "anon";

grant delete on table "public"."properties" to "authenticated";

grant insert on table "public"."properties" to "authenticated";

grant references on table "public"."properties" to "authenticated";

grant select on table "public"."properties" to "authenticated";

grant trigger on table "public"."properties" to "authenticated";

grant truncate on table "public"."properties" to "authenticated";

grant update on table "public"."properties" to "authenticated";

grant delete on table "public"."properties" to "service_role";

grant insert on table "public"."properties" to "service_role";

grant references on table "public"."properties" to "service_role";

grant select on table "public"."properties" to "service_role";

grant trigger on table "public"."properties" to "service_role";

grant truncate on table "public"."properties" to "service_role";

grant update on table "public"."properties" to "service_role";

grant delete on table "public"."property_claims" to "anon";

grant insert on table "public"."property_claims" to "anon";

grant references on table "public"."property_claims" to "anon";

grant select on table "public"."property_claims" to "anon";

grant trigger on table "public"."property_claims" to "anon";

grant truncate on table "public"."property_claims" to "anon";

grant update on table "public"."property_claims" to "anon";

grant delete on table "public"."property_claims" to "authenticated";

grant insert on table "public"."property_claims" to "authenticated";

grant references on table "public"."property_claims" to "authenticated";

grant select on table "public"."property_claims" to "authenticated";

grant trigger on table "public"."property_claims" to "authenticated";

grant truncate on table "public"."property_claims" to "authenticated";

grant update on table "public"."property_claims" to "authenticated";

grant delete on table "public"."property_claims" to "service_role";

grant insert on table "public"."property_claims" to "service_role";

grant references on table "public"."property_claims" to "service_role";

grant select on table "public"."property_claims" to "service_role";

grant trigger on table "public"."property_claims" to "service_role";

grant truncate on table "public"."property_claims" to "service_role";

grant update on table "public"."property_claims" to "service_role";

grant delete on table "public"."property_inbox" to "anon";

grant insert on table "public"."property_inbox" to "anon";

grant references on table "public"."property_inbox" to "anon";

grant select on table "public"."property_inbox" to "anon";

grant trigger on table "public"."property_inbox" to "anon";

grant truncate on table "public"."property_inbox" to "anon";

grant update on table "public"."property_inbox" to "anon";

grant delete on table "public"."property_inbox" to "authenticated";

grant insert on table "public"."property_inbox" to "authenticated";

grant references on table "public"."property_inbox" to "authenticated";

grant select on table "public"."property_inbox" to "authenticated";

grant trigger on table "public"."property_inbox" to "authenticated";

grant truncate on table "public"."property_inbox" to "authenticated";

grant update on table "public"."property_inbox" to "authenticated";

grant delete on table "public"."property_inbox" to "service_role";

grant insert on table "public"."property_inbox" to "service_role";

grant references on table "public"."property_inbox" to "service_role";

grant select on table "public"."property_inbox" to "service_role";

grant trigger on table "public"."property_inbox" to "service_role";

grant truncate on table "public"."property_inbox" to "service_role";

grant update on table "public"."property_inbox" to "service_role";

grant delete on table "public"."service_intents" to "anon";

grant insert on table "public"."service_intents" to "anon";

grant references on table "public"."service_intents" to "anon";

grant select on table "public"."service_intents" to "anon";

grant trigger on table "public"."service_intents" to "anon";

grant truncate on table "public"."service_intents" to "anon";

grant update on table "public"."service_intents" to "anon";

grant delete on table "public"."service_intents" to "authenticated";

grant insert on table "public"."service_intents" to "authenticated";

grant references on table "public"."service_intents" to "authenticated";

grant select on table "public"."service_intents" to "authenticated";

grant trigger on table "public"."service_intents" to "authenticated";

grant truncate on table "public"."service_intents" to "authenticated";

grant update on table "public"."service_intents" to "authenticated";

grant delete on table "public"."service_intents" to "service_role";

grant insert on table "public"."service_intents" to "service_role";

grant references on table "public"."service_intents" to "service_role";

grant select on table "public"."service_intents" to "service_role";

grant trigger on table "public"."service_intents" to "service_role";

grant truncate on table "public"."service_intents" to "service_role";

grant update on table "public"."service_intents" to "service_role";


  create policy "admin_events_service_only"
  on "public"."admin_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "ai_queries_insert_own"
  on "public"."ai_queries"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "ai_queries_select_own"
  on "public"."ai_queries"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "analytics_events_insert_auth"
  on "public"."analytics_events"
  as permissive
  for insert
  to public
with check (((user_id IS NULL) OR (user_id = auth.uid())));



  create policy "analytics_events_service_read"
  on "public"."analytics_events"
  as permissive
  for select
  to public
using ((auth.role() = 'service_role'::text));



  create policy "comments_delete"
  on "public"."home_comments"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = user_id) OR (auth.uid() IN ( SELECT pc.user_id
   FROM public.property_claims pc
  WHERE (pc.property_id = home_comments.property_id)))));



  create policy "comments_insert"
  on "public"."home_comments"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "comments_select"
  on "public"."home_comments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Home story delete by claimant"
  on "public"."home_story"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.property_claims pc
  WHERE ((pc.property_id = home_story.property_id) AND (pc.user_id = auth.uid())))));



  create policy "Home story insert by claimant"
  on "public"."home_story"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.property_claims pc
  WHERE ((pc.property_id = home_story.property_id) AND (pc.user_id = auth.uid())))));



  create policy "Home story read for any authenticated"
  on "public"."home_story"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Home story update by claimant"
  on "public"."home_story"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.property_claims pc
  WHERE ((pc.property_id = home_story.property_id) AND (pc.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.property_claims pc
  WHERE ((pc.property_id = home_story.property_id) AND (pc.user_id = auth.uid())))));



  create policy "debug_home_story_allow_all"
  on "public"."home_story"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "home_story_auth_insert"
  on "public"."home_story"
  as permissive
  for insert
  to public
with check ((auth.uid() IS NOT NULL));



  create policy "home_story_auth_read"
  on "public"."home_story"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "home_story_auth_update"
  on "public"."home_story"
  as permissive
  for update
  to public
using ((auth.uid() IS NOT NULL))
with check ((auth.uid() IS NOT NULL));



  create policy "home_story_owner_policy"
  on "public"."home_story"
  as permissive
  for all
  to authenticated
using ((auth.uid() IN ( SELECT property_claims.user_id
   FROM public.property_claims
  WHERE (property_claims.property_id = home_story.property_id))))
with check ((auth.uid() IN ( SELECT property_claims.user_id
   FROM public.property_claims
  WHERE (property_claims.property_id = home_story.property_id))));



  create policy "intent_flags_auth_select"
  on "public"."intent_flags"
  as permissive
  for select
  to authenticated
using (true);



  create policy "intent_flags_owner_upsert"
  on "public"."intent_flags"
  as permissive
  for all
  to authenticated
using ((auth.uid() IN ( SELECT property_claims.user_id
   FROM public.property_claims
  WHERE (property_claims.property_id = intent_flags.property_id))))
with check ((auth.uid() IN ( SELECT property_claims.user_id
   FROM public.property_claims
  WHERE (property_claims.property_id = intent_flags.property_id))));



  create policy "intent_flags_select_owner"
  on "public"."intent_flags"
  as permissive
  for select
  to public
using ((owner_id = auth.uid()));



  create policy "intent_flags_upsert_owner"
  on "public"."intent_flags"
  as permissive
  for all
  to public
using ((owner_id = auth.uid()))
with check ((owner_id = auth.uid()));



  create policy "public_read_intent_flags"
  on "public"."intent_flags"
  as permissive
  for select
  to public
using (true);



  create policy "messages_insert_sender"
  on "public"."messages"
  as permissive
  for insert
  to public
with check ((sender_id = auth.uid()));



  create policy "messages_select_participant"
  on "public"."messages"
  as permissive
  for select
  to public
using (((sender_id = auth.uid()) OR (receiver_id = auth.uid())));



  create policy "profiles_insert_own"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "properties_public_read"
  on "public"."properties"
  as permissive
  for select
  to public
using (true);



  create policy "properties_service_write"
  on "public"."properties"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "all users can read claims"
  on "public"."property_claims"
  as permissive
  for select
  to public
using (true);



  create policy "claims_delete_own"
  on "public"."property_claims"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "claims_insert_own"
  on "public"."property_claims"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "claims_select_own"
  on "public"."property_claims"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "property_claims_auth_select"
  on "public"."property_claims"
  as permissive
  for select
  to authenticated
using (true);



  create policy "property_claims_owner_insert"
  on "public"."property_claims"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "public_read_property_claims"
  on "public"."property_claims"
  as permissive
  for select
  to public
using (true);



  create policy "users can insert their own claim"
  on "public"."property_claims"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "inbox_insert_any_user"
  on "public"."property_inbox"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = sender_id));



  create policy "inbox_select_own"
  on "public"."property_inbox"
  as permissive
  for select
  to authenticated
using ((auth.uid() = sender_id));



  create policy "inbox_select_owner"
  on "public"."property_inbox"
  as permissive
  for select
  to authenticated
using ((auth.uid() IN ( SELECT pc.user_id
   FROM public.property_claims pc
  WHERE (pc.property_id = property_inbox.property_id))));



  create policy "service_intents_insert_own"
  on "public"."service_intents"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "service_intents_select_own"
  on "public"."service_intents"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



