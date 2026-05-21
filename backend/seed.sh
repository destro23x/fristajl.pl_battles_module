#!/bin/sh
# Creates/updates the admin dashboard account. Invoked as the command
# override of the db-seed ECS task (see infrastructure/components/terraform/fristajl-pl-db-seed-task)
# - never run by the deployed backend service itself.
set -e
exec mvn -q compile exec:java -Dexec.mainClass=io.javalin.omeglin.SeedMainKt
