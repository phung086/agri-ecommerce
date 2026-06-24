package com.agri.ecommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String backendUploads = toLocation(Path.of("uploads"));
        String workspaceUploads = toLocation(Path.of("..", "uploads"));

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(backendUploads, workspaceUploads);
    }

    private String toLocation(Path path) {
        String location = path.toAbsolutePath().normalize().toUri().toString();
        return location.endsWith("/") ? location : location + "/";
    }
}
