FROM mysql:8.0

ENV MYSQL_DATABASE=hotel_kong_arthur

COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY seed.sql /docker-entrypoint-initdb.d/02-seed.sql
