#!/bin/sh
# Runs Flyway schema migrations only. Invoked as the command override of the
# db-migrator ECS task (see infrastructure/components/terraform/fristajl-pl-db-migrator-task)
# - never run by the deployed backend service itself.
set -e
exec mvn -q compile exec:java -Dexec.mainClass=io.javalin.omeglin.MigrateMainKt
