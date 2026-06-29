package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ContactEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ContactRepository extends JpaRepository<ContactEntity, Long>, JpaSpecificationExecutor<ContactEntity> {

    @Query("""
            select contact
            from ContactEntity contact
            where lower(contact.fullName) like lower(concat('%', :keyword, '%'))
               or lower(coalesce(contact.email, '')) like lower(concat('%', :keyword, '%'))
               or lower(coalesce(contact.phoneNumber, '')) like lower(concat('%', :keyword, '%'))
               or lower(contact.message) like lower(concat('%', :keyword, '%'))
            order by contact.createdAt desc, contact.id desc
            """)
    List<ContactEntity> searchAdminContacts(@Param("keyword") String keyword, Pageable pageable);

    long countByRepliedFalse();
}
