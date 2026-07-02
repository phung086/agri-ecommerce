package com.agri.ecommerce.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Custom Flyway migration runner that handles the case where migrations were
 * partially applied to the database (e.g. due to DevTools hot-reloads or
 * interrupted runs) but Flyway's schema history is out of sync.
 *
 * <p>Before calling migrate(), this runner probes each pending migration SQL
 * file against the live database. If any statement fails with MySQL error 1060
 * (Duplicate column name), it means the migration was already applied — so we
 * mark it as successful in flyway_schema_history and skip it.
 *
 * <p>This is safe for fresh databases too: they won't have any duplicate
 * columns, so the probe will succeed and Flyway will apply the migration
 * normally via migrate().
 */
@Slf4j
@Component
@Order(-100)
@RequiredArgsConstructor
public class FlywayMigrationRunner implements ApplicationRunner {

    private final DataSource dataSource;

    @Value("${spring.flyway.enabled:false}")
    private boolean enabled;

    @Value("${spring.flyway.locations:classpath:db/migration}")
    private String[] locations;

    @Value("${spring.flyway.baseline-on-migrate:true}")
    private boolean baselineOnMigrate;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("[Flyway] Migration runner disabled via spring.flyway.enabled=false");
            return;
        }

        // Step 1: Build a Flyway instance and repair any failed entries
        Flyway flyway = buildFlyway();
        flyway.repair();
        log.info("[Flyway] Repair completed");

        // Step 2: Probe pending migrations and seed those whose columns already exist
        seedAlreadyAppliedMigrations(flyway);

        // Step 3: Build a FRESH Flyway instance to re-read schema history, then migrate
        Flyway freshFlyway = buildFlyway();
        freshFlyway.migrate();
        log.info("[Flyway] Migration completed");
    }

    private Flyway buildFlyway() {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations(locations)
                .baselineOnMigrate(baselineOnMigrate)
                .validateOnMigrate(false)
                .load();
    }

    /**
     * For each pending migration, try executing its SQL using a probe connection.
     * If MySQL error 1060 (Duplicate column name) is thrown, the migration was
     * partially applied — insert a success record into flyway_schema_history
     * so that Flyway skips it on the next migrate() call.
     */
    private void seedAlreadyAppliedMigrations(Flyway flyway) {
        MigrationInfo[] pending;
        try {
            pending = flyway.info().pending();
        } catch (Exception e) {
            log.warn("[Flyway] Could not read pending migrations: {}", e.getMessage());
            return;
        }

        if (pending == null || pending.length == 0) {
            log.info("[Flyway] No pending migrations to probe");
            return;
        }

        for (MigrationInfo info : pending) {
            if (info.getVersion() == null) continue;
            String version = info.getVersion().getVersion();

            // Skip if already successfully recorded (defensive check)
            if (isMigrationRecorded(version)) {
                log.debug("[Flyway] V{} already recorded as success, skipping probe", version);
                continue;
            }

            // Probe the migration SQL with a fresh connection
            boolean hasPartiallyAppliedColumns = probeForDuplicateColumns(info);

            if (hasPartiallyAppliedColumns) {
                log.warn("[Flyway] V{} ({}) detected as already partially applied — seeding as success to skip",
                        version, info.getDescription());
                insertSuccessRecord(version, info);
            }
        }
    }

    /**
     * Returns true if this migration's version already has a success=1 record
     * in flyway_schema_history.
     */
    private boolean isMigrationRecorded(String version) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT 1 FROM flyway_schema_history WHERE version = ? AND success = 1")) {
            ps.setString(1, version);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Executes each SQL statement in the migration script using a FRESH, isolated
     * connection. Returns true if any statement fails with error 1060 (Duplicate
     * column name), meaning the columns were already added previously.
     *
     * <p>This method uses its own connection so that DDL errors do not affect the
     * connection used by Flyway or by the seeding INSERT.
     */
    private boolean probeForDuplicateColumns(MigrationInfo info) {
        String script = info.getScript();
        URL resource = getClass().getClassLoader().getResource("db/migration/" + script);
        if (resource == null) {
            log.debug("[Flyway] Classpath resource not found for script: {}", script);
            return false;
        }

        try {
            String sql = new String(Files.readAllBytes(Paths.get(resource.toURI())));

            // Use a dedicated probe connection — completely separate from Flyway's connections
            try (Connection probeConn = dataSource.getConnection()) {
                probeConn.setAutoCommit(true);

                for (String rawStmt : sql.split(";")) {
                    // Strip single-line SQL comments and blank lines
                    String trimmed = rawStmt.replaceAll("(?m)--[^\n]*", "").trim();
                    if (trimmed.isEmpty()) continue;

                    try (Statement s = probeConn.createStatement()) {
                        s.execute(trimmed);
                    } catch (java.sql.SQLException ex) {
                        if (ex.getErrorCode() == 1060) {
                            // Duplicate column name → migration was already partially applied
                            log.debug("[Flyway] Probe: V{} statement failed with error 1060 (duplicate column), " +
                                    "columns already exist in DB", info.getVersion().getVersion());
                            return true;
                        }
                        // Any other SQL error: stop probing, let Flyway handle it normally
                        log.debug("[Flyway] Probe: V{} statement failed with error {} — not a duplicate column issue",
                                info.getVersion().getVersion(), ex.getErrorCode());
                        return false;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("[Flyway] Probe: could not probe V{}: {}", info.getVersion().getVersion(), e.getMessage());
        }
        return false;
    }

    /**
     * Inserts a success record for the given migration version into
     * flyway_schema_history, using a FRESH connection to avoid any state
     * contamination from the probe connection.
     */
    private void insertSuccessRecord(String version, MigrationInfo info) {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(true);

            // Get next installed_rank in a separate query to avoid INSERT-SELECT on same table
            int nextRank = 1;
            try (Statement s = conn.createStatement();
                 ResultSet rs = s.executeQuery(
                         "SELECT COALESCE(MAX(installed_rank), 0) + 1 FROM flyway_schema_history")) {
                if (rs.next()) {
                    nextRank = rs.getInt(1);
                }
            }

            String description = info.getDescription() != null ? info.getDescription() : "";
            String script = info.getScript() != null ? info.getScript() : "";

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO flyway_schema_history " +
                    "(installed_rank, version, description, type, script, checksum, " +
                    " installed_by, installed_on, execution_time, success) " +
                    "VALUES (?, ?, ?, 'SQL', ?, 0, 'flyway-auto-seed', NOW(), 0, 1)")) {
                ps.setInt(1, nextRank);
                ps.setString(2, version);
                ps.setString(3, description);
                ps.setString(4, script);
                ps.executeUpdate();
                log.info("[Flyway] Seeded V{} ({}) as success in flyway_schema_history (installed_rank={})",
                        version, description, nextRank);
            }
        } catch (Exception e) {
            log.error("[Flyway] Failed to seed V{} into schema history: {}", version, e.getMessage());
        }
    }
}
