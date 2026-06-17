package com.agri.ecommerce.security;

import com.agri.ecommerce.entity.PermissionEntity;
import com.agri.ecommerce.entity.RoleEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;

    private final String name;

    private final String email;

    private final String password;

    private final UserStatus status;

    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(
            Long id,
            String name,
            String email,
            String password,
            UserStatus status,
            Collection<? extends GrantedAuthority> authorities
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.status = status;
        this.authorities = authorities;
    }

    public static UserPrincipal create(UserEntity user) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        RoleEntity role = user.getRole();

        if (role != null && role.getName() != null) {
            String roleAuthority = "ROLE_" + role.getName().toUpperCase();
            authorities.add(new SimpleGrantedAuthority(roleAuthority));

            if (role.getPermissions() != null) {
                for (PermissionEntity permission : role.getPermissions()) {
                    authorities.add(new SimpleGrantedAuthority(permission.getName()));
                }
            }
        }

        return new UserPrincipal(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPassword(),
                user.getStatus(),
                authorities
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return status != UserStatus.deleted;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != UserStatus.banned && status != UserStatus.deleted;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return status != UserStatus.deleted;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.active;
    }
}