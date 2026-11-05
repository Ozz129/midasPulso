-- Crea el rol y la base de desarrollo de MYDAS PULSO en una instancia PostgreSQL local.
-- Credenciales de ejemplo, solo para desarrollo. Ejecutar como superusuario:
--   psql -h localhost -U postgres -f scripts/create-dev-database.sql
SELECT 'CREATE ROLE pulso LOGIN PASSWORD ''pulso'''
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pulso')\gexec

SELECT 'CREATE DATABASE mydas_pulso OWNER pulso'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mydas_pulso')\gexec
