FROM maven:3.9-eclipse-temurin-21
WORKDIR /app

# Pre-fetch dependencies using only pom.xml (cached layer).
# -C fails the build on a checksum mismatch instead of silently baking in a
# corrupted/truncated jar (Maven's default is lax checksum checking, which
# only warns) - a corrupted jar here surfaces later as a confusing
# NoClassDefFoundError at container runtime instead of a build failure here.
COPY pom.xml .
RUN mvn dependency:go-offline -C -q

# Source is mounted as a volume in development
COPY src ./src

# One-off migrate/seed entrypoints, used as the `command` override of the
# db-migrator/db-seed ECS tasks instead of the default backend server command.
COPY migrate.sh seed.sh ./
RUN chmod +x migrate.sh seed.sh

EXPOSE 7070

CMD ["mvn", "compile", "exec:java", "-Dexec.mainClass=io.javalin.omeglin.OmeglinMainKt", "-q"]
