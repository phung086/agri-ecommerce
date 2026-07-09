package com.agri.ecommerce.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(-10)
@RequiredArgsConstructor
public class LoyaltySchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (tableExists("users")) {
            addColumnIfMissing(
                    "users",
                    "loyalty_points",
                    "ALTER TABLE users ADD COLUMN loyalty_points int NOT NULL DEFAULT 0 AFTER google_id"
            );
            addColumnIfMissing(
                    "users",
                    "membership_tier",
                    "ALTER TABLE users ADD COLUMN membership_tier varchar(50) NOT NULL DEFAULT 'BRONZE' AFTER loyalty_points"
            );
        }

        if (tableExists("orders")) {
            addColumnIfMissing(
                    "orders",
                    "shipping_name",
                    "ALTER TABLE orders ADD COLUMN shipping_name varchar(255) DEFAULT NULL AFTER shipping_address_id"
            );
            addColumnIfMissing(
                    "orders",
                    "shipping_phone",
                    "ALTER TABLE orders ADD COLUMN shipping_phone varchar(255) DEFAULT NULL AFTER shipping_name"
            );
            addColumnIfMissing(
                    "orders",
                    "shipping_address_detail",
                    "ALTER TABLE orders ADD COLUMN shipping_address_detail varchar(255) DEFAULT NULL AFTER shipping_phone"
            );
            addColumnIfMissing(
                    "orders",
                    "shipping_city",
                    "ALTER TABLE orders ADD COLUMN shipping_city varchar(255) DEFAULT NULL AFTER shipping_address_detail"
            );
            addColumnIfMissing(
                    "orders",
                    "checkout_type",
                    "ALTER TABLE orders ADD COLUMN checkout_type varchar(20) NOT NULL DEFAULT 'CUSTOMER' AFTER status"
            );
            addColumnIfMissing(
                    "orders",
                    "guest_email",
                    "ALTER TABLE orders ADD COLUMN guest_email varchar(255) DEFAULT NULL AFTER checkout_type"
            );
            addColumnIfMissing(
                    "orders",
                    "guest_token",
                    "ALTER TABLE orders ADD COLUMN guest_token varchar(64) DEFAULT NULL AFTER guest_email"
            );
            addColumnIfMissing(
                    "orders",
                    "points_used",
                    "ALTER TABLE orders ADD COLUMN points_used int NOT NULL DEFAULT 0 AFTER guest_token"
            );
            addColumnIfMissing(
                    "orders",
                    "points_earned",
                    "ALTER TABLE orders ADD COLUMN points_earned int NOT NULL DEFAULT 0 AFTER points_used"
            );
            addColumnIfMissing(
                    "orders",
                    "return_reason",
                    "ALTER TABLE orders ADD COLUMN return_reason text DEFAULT NULL AFTER delivery_failure_reason"
            );
            addColumnIfMissing(
                    "orders",
                    "return_note",
                    "ALTER TABLE orders ADD COLUMN return_note text DEFAULT NULL AFTER return_reason"
            );
            addColumnIfMissing(
                    "orders",
                    "returned_at",
                    "ALTER TABLE orders ADD COLUMN returned_at timestamp NULL DEFAULT NULL AFTER return_note"
            );
            makeVarcharIfNeeded(
                    "orders",
                    "status",
                    "ALTER TABLE orders MODIFY COLUMN status varchar(50) NOT NULL DEFAULT 'pending'"
            );
            makeColumnNullableIfNeeded(
                    "orders",
                    "user_id",
                    "ALTER TABLE orders MODIFY COLUMN user_id bigint(20) UNSIGNED NULL"
            );
            makeColumnNullableIfNeeded(
                    "orders",
                    "shipping_address_id",
                    "ALTER TABLE orders MODIFY COLUMN shipping_address_id bigint(20) UNSIGNED NULL"
            );
            jdbcTemplate.update("""
                    update orders
                    set checkout_type = 'CUSTOMER'
                    where checkout_type is null or trim(checkout_type) = ''
                    """);
            addIndexIfMissing(
                    "orders",
                    "idx_orders_checkout_type",
                    "CREATE INDEX idx_orders_checkout_type ON orders (checkout_type)"
            );
            addIndexIfMissing(
                    "orders",
                    "uk_orders_guest_token",
                    "CREATE UNIQUE INDEX uk_orders_guest_token ON orders (guest_token)"
            );
        }

        if (tableExists("users")) {
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS loyalty_transactions (
                      id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                      user_id bigint(20) UNSIGNED NOT NULL,
                      amount int NOT NULL,
                      type varchar(50) NOT NULL,
                      note varchar(255) DEFAULT NULL,
                      created_at datetime NOT NULL,
                      PRIMARY KEY (id),
                      CONSTRAINT fk_loyalty_user
                        FOREIGN KEY (user_id) REFERENCES users (id)
                        ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """);
            addIndexIfMissing(
                    "loyalty_transactions",
                    "idx_loyalty_transactions_user_created",
                    "CREATE INDEX idx_loyalty_transactions_user_created ON loyalty_transactions (user_id, created_at)"
            );
        }

        if (tableExists("order_status_history")) {
            makeVarcharIfNeeded(
                    "order_status_history",
                    "status",
                    "ALTER TABLE order_status_history MODIFY COLUMN status varchar(50) DEFAULT NULL"
            );
        }
    }

    private void addColumnIfMissing(String tableName, String columnName, String alterSql) {
        Integer existingColumns = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.columns
                        where table_schema = database()
                          and table_name = ?
                          and column_name = ?
                        """,
                Integer.class,
                tableName,
                columnName
        );

        if (existingColumns == null || existingColumns == 0) {
            jdbcTemplate.execute(alterSql);
        }
    }

    private void addIndexIfMissing(String tableName, String indexName, String createSql) {
        Integer existingIndexes = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.statistics
                        where table_schema = database()
                          and table_name = ?
                          and index_name = ?
                        """,
                Integer.class,
                tableName,
                indexName
        );

        if (existingIndexes == null || existingIndexes == 0) {
            jdbcTemplate.execute(createSql);
        }
    }

    private void makeColumnNullableIfNeeded(String tableName, String columnName, String alterSql) {
        String nullable = jdbcTemplate.queryForObject(
                """
                        select is_nullable
                        from information_schema.columns
                        where table_schema = database()
                          and table_name = ?
                          and column_name = ?
                        """,
                String.class,
                tableName,
                columnName
        );

        if ("NO".equalsIgnoreCase(nullable)) {
            jdbcTemplate.execute(alterSql);
        }
    }

    private void makeVarcharIfNeeded(String tableName, String columnName, String alterSql) {
        String dataType = jdbcTemplate.queryForObject(
                """
                        select data_type
                        from information_schema.columns
                        where table_schema = database()
                          and table_name = ?
                          and column_name = ?
                        """,
                String.class,
                tableName,
                columnName
        );

        if (!"varchar".equalsIgnoreCase(dataType)) {
            jdbcTemplate.execute(alterSql);
        }
    }

    private boolean tableExists(String tableName) {
        Integer existingTables = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.tables
                        where table_schema = database()
                          and table_name = ?
                        """,
                Integer.class,
                tableName
        );

        return existingTables != null && existingTables > 0;
    }
}
