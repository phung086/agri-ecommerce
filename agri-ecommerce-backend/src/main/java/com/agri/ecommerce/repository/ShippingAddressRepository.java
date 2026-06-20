package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ShippingAddressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShippingAddressRepository extends JpaRepository<ShippingAddressEntity, Long> {

    List<ShippingAddressEntity> findByUser_IdOrderByDefaultAddressDescCreatedAtDesc(Long userId);

    Optional<ShippingAddressEntity> findByIdAndUser_Id(Long id, Long userId);

    Optional<ShippingAddressEntity> findFirstByUser_IdAndDefaultAddressTrue(Long userId);

    boolean existsByUser_Id(Long userId);

    @Modifying
    @Query("update ShippingAddressEntity address set address.defaultAddress = false where address.user.id = :userId")
    void clearDefaultByUserId(@Param("userId") Long userId);
}
