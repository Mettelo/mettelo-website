-- Every signed-in Lab read can check for reviewed existing assignments. Lookup
-- by verified email must not scan all legacy people as the platform grows.
create index legacy_people_verified_email on private_legacy_roster.people(normalized_email,batch_key) where not held;
