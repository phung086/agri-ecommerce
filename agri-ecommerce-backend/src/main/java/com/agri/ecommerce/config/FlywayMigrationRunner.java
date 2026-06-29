package com.agri.ecommerce.config;

import lombok.RequiredArgsConstructor;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

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
            return;
        }

        Flyway.configure()
                .dataSource(dataSource)
                .locations(locations)
                .baselineOnMigrate(baselineOnMigrate)
                .load()
                .migrate();
    }
}
