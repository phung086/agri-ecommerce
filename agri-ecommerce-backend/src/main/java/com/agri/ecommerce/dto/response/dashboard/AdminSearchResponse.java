package com.agri.ecommerce.dto.response.dashboard;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminSearchResponse {

    private String type;

    private String groupLabel;

    private Long id;

    private String title;

    private String subtitle;

    private String targetUrl;
}
