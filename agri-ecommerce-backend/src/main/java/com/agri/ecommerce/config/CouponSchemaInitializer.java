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
public class CouponSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        addColumnIfMissing(
                "coupon_type",
                "ALTER TABLE coupons ADD COLUMN coupon_type varchar(50) NOT NULL DEFAULT 'ORDER_DISCOUNT' AFTER code"
        );
        addColumnIfMissing(
                "discount_type",
                "ALTER TABLE coupons ADD COLUMN discount_type varchar(50) NOT NULL DEFAULT 'PERCENTAGE' AFTER coupon_type"
        );
        addColumnIfMissing(
                "discount_amount",
                "ALTER TABLE coupons ADD COLUMN discount_amount decimal(10,2) DEFAULT NULL AFTER discount_percentage"
        );
        addColumnIfMissing(
                "starts_at",
                "ALTER TABLE coupons ADD COLUMN starts_at timestamp NULL DEFAULT NULL AFTER discount_amount"
        );
    }

    private void addColumnIfMissing(String columnName, String alterSql) {
        Integer existingColumns = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.columns
                        where table_schema = database()
                          and table_name = 'coupons'
                          and column_name = ?
                        """,
                Integer.class,
                columnName
        );

        if (existingColumns == null || existingColumns == 0) {
            jdbcTemplate.execute(alterSql);
        }
    }
}
