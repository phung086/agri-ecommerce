package com.agri.ecommerce.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(0)
@RequiredArgsConstructor
public class LocalizedFieldSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (tableExists("categories")) {
            addColumnIfMissing(
                    "categories",
                    "name_en",
                    "ALTER TABLE categories ADD COLUMN name_en varchar(255) DEFAULT NULL AFTER name"
            );
            addColumnIfMissing(
                    "categories",
                    "description_en",
                    "ALTER TABLE categories ADD COLUMN description_en text DEFAULT NULL AFTER description"
            );
        }

        if (tableExists("products")) {
            addColumnIfMissing(
                    "products",
                    "name_en",
                    "ALTER TABLE products ADD COLUMN name_en varchar(255) DEFAULT NULL AFTER name"
            );
            addColumnIfMissing(
                    "products",
                    "description_en",
                    "ALTER TABLE products ADD COLUMN description_en text DEFAULT NULL AFTER description"
            );
            addColumnIfMissing(
                    "products",
                    "unit_en",
                    "ALTER TABLE products ADD COLUMN unit_en varchar(255) DEFAULT NULL AFTER unit"
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
