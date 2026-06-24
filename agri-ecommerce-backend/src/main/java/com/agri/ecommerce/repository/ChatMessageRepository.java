package com.agri.ecommerce.repository;

import com.agri.ecommerce.entity.ChatMessageEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    Page<ChatMessageEntity> findByUser_Id(Long userId, Pageable pageable);

    Page<ChatMessageEntity> findByGuestToken(String guestToken, Pageable pageable);

    @Query(value = """
            select latest.user_id,
                   latest.guest_token,
                   latest.sender,
                   latest.message,
                   latest.created_at,
                   totals.total_messages,
                   user_table.name,
                   user_table.email
            from chat_messages latest
            join (
                select coalesce(concat('user:', user_id), concat('guest:', guest_token)) as conversation_key,
                       max(id) as last_id,
                       count(id) as total_messages
                from chat_messages
                where (:keyword is null or lower(message) like lower(concat('%', :keyword, '%')))
                group by coalesce(concat('user:', user_id), concat('guest:', guest_token))
            ) totals on latest.id = totals.last_id
            left join users user_table on latest.user_id = user_table.id
            where (:lastSender is null or latest.sender = :lastSender)
            order by latest.created_at desc, latest.id desc
            """,
            countQuery = """
                    select count(*)
                    from (
                        select latest.id
                        from chat_messages latest
                        join (
                            select coalesce(concat('user:', user_id), concat('guest:', guest_token)) as conversation_key,
                                   max(id) as last_id
                            from chat_messages
                            where (:keyword is null or lower(message) like lower(concat('%', :keyword, '%')))
                            group by coalesce(concat('user:', user_id), concat('guest:', guest_token))
                        ) totals on latest.id = totals.last_id
                        where (:lastSender is null or latest.sender = :lastSender)
                    ) conversation_count
                    """,
            nativeQuery = true)
    Page<Object[]> findConversationSummaries(
            @Param("keyword") String keyword,
            @Param("lastSender") String lastSender,
            Pageable pageable
    );
}
