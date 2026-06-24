package com.agri.ecommerce.service;

public interface LoginAttemptService {

    void assertNotBlocked(String email);

    void recordFailure(String email);

    void clear(String email);
}
