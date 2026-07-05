package com.agri.ecommerce.service;

import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.impl.GhnShippingCarrierServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.text.Normalizer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GhnNormalizeNameTest {

    private GhnShippingCarrierServiceImpl service;
    private Method normalizeName;

    @BeforeEach
    void setUp() throws Exception {
        service = new GhnShippingCarrierServiceImpl(
                mock(OrderItemRepository.class),
                mock(PaymentRepository.class)
        );
        normalizeName = GhnShippingCarrierServiceImpl.class.getDeclaredMethod("normalizeName", String.class);
        normalizeName.setAccessible(true);
    }

    @Test
    void normalizeName_haNoi_returnsHanoi() throws Exception {
        // Given
        String name = "Hà Nội";

        // When
        String normalized = normalize(name);

        // Then
        assertThat(normalized).isEqualTo("hanoi");
    }

    @Test
    void normalizeName_withPrefix_thanhPhoHaNoi_returnsHanoi() throws Exception {
        // Given
        String name = "Thành phố Hà Nội";

        // When
        String normalized = normalize(name);

        // Then
        assertThat(normalized).isEqualTo("hanoi");
    }

    @Test
    void normalizeName_district_quanHaDong_returnsHadong() throws Exception {
        // Given
        String name = "Quận Hà Đông";

        // When
        String normalized = normalize(name);

        // Then
        assertThat(normalized).isEqualTo("hadong");
    }

    @Test
    void normalizeName_ward_phuongDuongNoi_returnsDuongnoi() throws Exception {
        // Given
        String name = "Phường Dương Nội";

        // When
        String normalized = normalize(name);

        // Then
        assertThat(normalized).isEqualTo("duongnoi");
    }

    @Test
    void normalizeName_null_returnsEmpty() throws Exception {
        // Given
        String name = null;

        // When
        String normalized = normalize(name);

        // Then
        assertThat(normalized).isEmpty();
    }

    @Test
    void normalizeName_NFD_vs_NFC_sameResult() throws Exception {
        // Given
        String nfc = "Đà Nẵng";
        String nfd = Normalizer.normalize(nfc, Normalizer.Form.NFD);

        // When
        String normalizedNfc = normalize(nfc);
        String normalizedNfd = normalize(nfd);

        // Then
        assertThat(normalizedNfd).isEqualTo(normalizedNfc);
        assertThat(normalizedNfc).isEqualTo("danang");
    }

    @Test
    void normalizeName_hoChiMinh_returnsHochiminhOrSaigon() throws Exception {
        // Given
        String name = "Thành phố Hồ Chí Minh";

        // When
        String normalized = normalize(name);

        // Then
        assertThat(normalized).isIn("hochiminh", "saigon");
    }

    private String normalize(String name) throws Exception {
        return (String) normalizeName.invoke(service, name);
    }
}
