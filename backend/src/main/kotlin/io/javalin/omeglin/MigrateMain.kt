package io.javalin.omeglin

import org.flywaydb.core.Flyway

/**
 * One-off entrypoint for the db-migrator ECS task (invoked via migrate.sh) -
 * applies Flyway schema migrations only. Never called by the running
 * backend service, which now assumes the schema is already up to date.
 */
fun main() {
    val creds = DbConnection.resolveFromEnv()
    println("Migrate: connecting to ${creds.jdbcUrl} as ${creds.user}")

    Flyway.configure()
        .dataSource(creds.jdbcUrl, creds.user, creds.password)
        .locations("classpath:db/migration")
        .load()
        .migrate()

    println("Migrate: done")
}
