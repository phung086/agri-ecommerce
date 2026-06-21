package com.agri.ecommerce.dto.response.seo;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SeoBreadcrumbResponse {

    private String name;

    private String path;
}
