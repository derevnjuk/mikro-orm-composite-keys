create extension if not exists "uuid-ossp";
create table "member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), constraint "member_pkey" primary key ("id"));
create table "group" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), constraint "group_pkey" primary key ("id"));
create table "group_member" ("member_id" uuid NOT NULL, "group_id" uuid NOT NULL, constraint "group_member_pkey" primary key ("member_id", "group_id"));
