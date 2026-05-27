alter table users add column if not exists full_name text not null default '';

do $$
begin
	if exists (
		select 1
		from information_schema.columns
		where table_name = 'users'
			and column_name = 'first_name'
	) then
		update users
		set full_name = trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
		where full_name = '';
	end if;
end $$;

alter table users drop column if exists first_name;
alter table users drop column if exists last_name;
