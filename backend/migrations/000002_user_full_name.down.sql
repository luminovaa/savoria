alter table users add column if not exists first_name text not null default '';
alter table users add column if not exists last_name text not null default '';

update users
set first_name = full_name
where first_name = '';

alter table users drop column if exists full_name;
