package com.agri.ecommerce.config;

import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.repository.RoleRepository;
import com.agri.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AdminAccountSeeder implements ApplicationRunner {

    private static final String ADMIN_ROLE = "admin";
    private static final String ADMIN_EMAIL = "admin@example.com";

    private final RoleRepository roleRepository;

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-password:123456}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        RoleEntity adminRole = roleRepository.findByName(ADMIN_ROLE)
                .orElseGet(this::createAdminRole);

        UserEntity adminUser = userRepository.findByEmail(ADMIN_EMAIL)
                .orElseGet(() -> createAdminUser(adminRole));

        boolean changed = false;

        if (!passwordEncoder.matches(adminPassword, adminUser.getPassword())) {
            adminUser.setPassword(passwordEncoder.encode(adminPassword));
            changed = true;
        }

        if (adminUser.getStatus() != UserStatus.active) {
            adminUser.setStatus(UserStatus.active);
            changed = true;
        }

        if (adminUser.getRole() == null
                || !ADMIN_ROLE.equalsIgnoreCase(adminUser.getRole().getName())) {
            adminUser.setRole(adminRole);
            changed = true;
        }

        if (changed) {
            userRepository.save(adminUser);
        }
    }

    private RoleEntity createAdminRole() {
        LocalDateTime now = LocalDateTime.now();

        RoleEntity role = RoleEntity.builder()
                .name(ADMIN_ROLE)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return roleRepository.save(role);
    }

    private UserEntity createAdminUser(RoleEntity adminRole) {
        return UserEntity.builder()
                .name("Admin User")
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode(adminPassword))
                .status(UserStatus.active)
                .phoneNumber("099999999")
                .address("Da Nang, Vietnam")
                .role(adminRole)
                .build();
    }
}
