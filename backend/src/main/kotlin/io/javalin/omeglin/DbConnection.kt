package io.javalin.omeglin

import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.rds.RdsUtilities

/**
 * Resolves JDBC connection details from the RDS_HOST/RDS_PORT/DB_NAME/
 * DB_USER/DB_SSL/DB_IAM_AUTH env vars set by the db-migrator-task/db-seed-task
 * ECS task definitions, and (when RDS_HOST is set) by the running backend
 * service's own ECS task definition too.
 */
object DbConnection {

    data class Credentials(val jdbcUrl: String, val user: String, val password: String)

    /** Generates a fresh SigV4 auth token (valid ~15 min) - call again to refresh, never cache long-term. */
    fun generateIamToken(host: String, port: Int, user: String): String {
        val region = System.getenv("AWS_REGION") ?: "eu-central-1"
        val utilities = RdsUtilities.builder()
            .region(Region.of(region))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build()
        return utilities.generateAuthenticationToken { b -> b.hostname(host).port(port).username(user) }
    }

    fun resolveFromEnv(): Credentials {
        val host = System.getenv("RDS_HOST") ?: error("RDS_HOST must be set")
        val port = System.getenv("RDS_PORT")?.toIntOrNull() ?: 5432
        val dbName = System.getenv("DB_NAME") ?: error("DB_NAME must be set")
        val user = System.getenv("DB_USER") ?: error("DB_USER must be set")
        val ssl = System.getenv("DB_SSL") == "true"
        val iamAuth = System.getenv("DB_IAM_AUTH") == "true"

        // application_user_fristajl/migration_user_fristajl have no password
        // (rds_iam role members) - a short-lived SigV4 auth token is
        // generated instead, signed with whatever AWS credentials the
        // current process has (the ECS task role in prod).
        val password = if (iamAuth) {
            generateIamToken(host, port, user)
        } else {
            System.getenv("DB_PASSWORD") ?: error("DB_PASSWORD must be set when DB_IAM_AUTH is not true")
        }

        val jdbcUrl = "jdbc:postgresql://$host:$port/$dbName" + if (ssl) "?sslmode=require" else ""
        return Credentials(jdbcUrl, user, password)
    }
}
