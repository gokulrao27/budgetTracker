-- Use scripts/seed.ts for hashed development users. Do not insert plaintext passwords.
insert into albums(name) values ('Wedding Prep'),('College Days'),('Trips'),('Friends'),('Random Chaos') on conflict do nothing;
