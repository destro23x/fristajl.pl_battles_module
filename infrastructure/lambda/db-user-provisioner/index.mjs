// Provisions the fristajl database and its IAM-authenticated roles
// (application_user_fristajl, migration_user_fristajl) on the SHARED
// events-app RDS instance.
//
// Unlike events-app's own db-user-provisioner (which only ever connects to
// its instance's single pre-existing default database), this function must
// also create its OWN database on first run, since fristajl and
// events-app run on the same physical RDS instance but each own a distinct
// database. `CREATE DATABASE` cannot run inside a transaction block and has
// no native `IF NOT EXISTS` clause, so database creation is done as a
// separate step against the instance's default/admin database, before
// connecting to the newly created database to set up extensions/roles/grants.
import pg from "pg";
import format from "pg-format";
import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const { Client } = pg;

const rds = new RDSClient({});
const ssm = new SSMClient({});

async function resolveConnectionDetails() {
  const instanceIdentifier = process.env.RDS_INSTANCE_IDENTIFIER;
  if (!instanceIdentifier) {
    throw new Error("RDS_INSTANCE_IDENTIFIER environment variable is not set");
  }

  const { DBInstances } = await rds.send(
    new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceIdentifier })
  );
  const instance = DBInstances?.[0];
  if (!instance) {
    throw new Error(`RDS instance not found: ${instanceIdentifier}`);
  }

  return {
    host: instance.Endpoint.Address,
    port: instance.Endpoint.Port,
    // Connect to the instance's own default database (owned by events-app)
    // only to run CREATE DATABASE - never used for anything else.
    adminDatabase: instance.DBName,
    adminUser: instance.MasterUsername,
  };
}

async function getSsmParameter(parameterNameEnvVar) {
  const name = process.env[parameterNameEnvVar];
  if (!name) {
    throw new Error(`${parameterNameEnvVar} environment variable is not set`);
  }
  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );
  return Parameter.Value;
}

async function ensureDatabase(adminClient, databaseName) {
  const { rows } = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );
  if (rows.length === 0) {
    // CREATE DATABASE cannot run inside a transaction block or take
    // parameterized identifiers - %I safely quotes/escapes the identifier.
    await adminClient.query(format("CREATE DATABASE %I", databaseName));
  }
}

async function upsertIamRole(client, roleName) {
  const { rows } = await client.query(
    "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1",
    [roleName]
  );
  if (rows.length === 0) {
    await client.query(format("CREATE ROLE %I LOGIN", roleName));
  }
  // Grant rds_iam unconditionally (idempotent) so the role authenticates
  // via an IAM auth token instead of a password.
  await client.query(format("GRANT rds_iam TO %I", roleName));
}

export const handler = async (event) => {
  const payload = event ?? {};

  const connection = payload.host
    ? payload
    : { ...(await resolveConnectionDetails()), ...payload };
  const adminPassword =
    payload.adminPassword ?? (await getSsmParameter("ADMIN_PASSWORD_PARAMETER_NAME"));

  const { host, port, adminDatabase, adminUser } = connection;
  const databaseName = payload.database ?? process.env.DATABASE_NAME;
  const applicationRole = payload.applicationRole ?? process.env.APPLICATION_ROLE_NAME;
  const migrationRole = payload.migrationRole ?? process.env.MIGRATION_ROLE_NAME;

  if (!databaseName || !applicationRole || !migrationRole) {
    throw new Error(
      "DATABASE_NAME, APPLICATION_ROLE_NAME and MIGRATION_ROLE_NAME must all be set"
    );
  }

  // Step 1: connect to the instance's default/admin database (events-app's
  // "events_app" database) purely to create fristajl's own database if
  // it doesn't exist yet.
  const adminClient = new Client({
    host,
    port: Number(port),
    database: adminDatabase,
    user: adminUser,
    password: adminPassword,
    ssl: { rejectUnauthorized: false },
  });
  await adminClient.connect();
  try {
    await ensureDatabase(adminClient, databaseName);
  } finally {
    await adminClient.end();
  }

  // Step 2: connect to fristajl's own database to create extensions,
  // IAM roles and grants.
  const client = new Client({
    host,
    port: Number(port),
    database: databaseName,
    user: adminUser,
    password: adminPassword,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query("BEGIN");

    await upsertIamRole(client, applicationRole);
    await upsertIamRole(client, migrationRole);

    await client.query(
      format("GRANT CONNECT ON DATABASE %I TO %I, %I", databaseName, applicationRole, migrationRole)
    );
    await client.query(format("GRANT USAGE ON SCHEMA public TO %I, %I", applicationRole, migrationRole));
    await client.query(format("GRANT CREATE ON SCHEMA public TO %I", migrationRole));

    await client.query(
      format("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I", applicationRole)
    );
    await client.query(format("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I", applicationRole));
    await client.query(format("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO %I", migrationRole));
    await client.query(format("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO %I", migrationRole));

    // Grants issued by migrationRole itself (e.g. when it later creates new
    // tables via migrations) automatically flow to applicationRole.
    await client.query(format("GRANT %I TO %I", migrationRole, adminUser));
    await client.query(
      format(
        "ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I",
        migrationRole,
        applicationRole
      )
    );
    await client.query(
      format(
        "ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I",
        migrationRole,
        applicationRole
      )
    );
    await client.query(format("REVOKE %I FROM %I", migrationRole, adminUser));

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  return {
    statusCode: 200,
    message: `Database ${databaseName} ensured; ${applicationRole}/${migrationRole} provisioned successfully`,
  };
};
