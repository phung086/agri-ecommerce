package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.chat.AdminChatReplyRequest;
import com.agri.ecommerce.dto.request.chat.ChatMessageRequest;
import com.agri.ecommerce.dto.request.chat.GuestChatMessageRequest;
import com.agri.ecommerce.dto.response.chat.ChatConversationResponse;
import com.agri.ecommerce.dto.response.chat.ChatMessageResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.entity.ChatMessageEntity;
import com.agri.ecommerce.entity.UserEntity;
import com.agri.ecommerce.entity.UserStatus;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.ChatMessageMapper;
import com.agri.ecommerce.repository.ChatMessageRepository;
import com.agri.ecommerce.repository.UserRepository;
import com.agri.ecommerce.service.ChatService;
import com.agri.ecommerce.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private static final String ROLE_ADMIN = "admin";
    private static final String SENDER_USER = "user";
    private static final String SENDER_BOT = "bot";
    private static final String NOTIFICATION_TYPE_CHAT = "chat";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_SENDERS = Set.of(SENDER_USER, SENDER_BOT);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "sender", "createdAt", "updatedAt");

    private final ChatMessageRepository chatMessageRepository;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    private final ChatMessageMapper chatMessageMapper;

    @Override
    @Transactional
    public ChatMessageResponse sendGuestMessage(GuestChatMessageRequest request) {
        String guestToken = normalizeGuestTokenOrGenerate(request.getGuestToken());
        ChatMessageEntity chatMessage = chatMessageRepository.save(ChatMessageEntity.builder()
                .guestToken(guestToken)
                .sender(SENDER_USER)
                .message(cleanRequiredMessage(request.getMessage()))
                .build());

        notifyAdmins(
                "Có tin nhắn chat mới từ khách vãng lai",
                "/admin/chat?guestToken=" + guestToken
        );

        return chatMessageMapper.toChatMessageResponse(chatMessage);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> getGuestMessages(String guestToken, int page, int size, String sort) {
        validatePaging(page, size);
        String normalizedGuestToken = normalizeRequiredGuestToken(guestToken);
        Page<ChatMessageEntity> messagePage = chatMessageRepository.findByGuestToken(
                normalizedGuestToken,
                PageRequest.of(page, size, parseSort(sort))
        );

        return toMessagePageResponse(messagePage);
    }

    @Override
    @Transactional
    public ChatMessageResponse sendCustomerMessage(Long userId, ChatMessageRequest request) {
        UserEntity user = findUserById(userId);
        ChatMessageEntity chatMessage = chatMessageRepository.save(ChatMessageEntity.builder()
                .user(user)
                .sender(SENDER_USER)
                .message(cleanRequiredMessage(request.getMessage()))
                .build());

        notifyAdmins(
                "Có tin nhắn chat mới từ " + user.getName(),
                "/admin/chat?userId=" + user.getId()
        );

        return chatMessageMapper.toChatMessageResponse(chatMessage);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> getCustomerMessages(Long userId, int page, int size, String sort) {
        validatePaging(page, size);
        Page<ChatMessageEntity> messagePage = chatMessageRepository.findByUser_Id(
                userId,
                PageRequest.of(page, size, parseSort(sort))
        );

        return toMessagePageResponse(messagePage);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatConversationResponse> getAdminConversations(String keyword, String lastSender, int page, int size) {
        validatePaging(page, size);
        Page<Object[]> conversationPage = chatMessageRepository.findConversationSummaries(
                cleanBlank(keyword),
                normalizeOptionalSender(lastSender),
                PageRequest.of(page, size)
        );

        return PageResponse.<ChatConversationResponse>builder()
                .content(conversationPage.getContent().stream().map(this::toConversationResponse).toList())
                .page(conversationPage.getNumber())
                .size(conversationPage.getSize())
                .totalElements(conversationPage.getTotalElements())
                .totalPages(conversationPage.getTotalPages())
                .last(conversationPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> getAdminMessages(Long userId, String guestToken, int page, int size, String sort) {
        validatePaging(page, size);
        ConversationTarget target = normalizeConversationTarget(userId, guestToken);
        Page<ChatMessageEntity> messagePage = target.userId() != null
                ? chatMessageRepository.findByUser_Id(target.userId(), PageRequest.of(page, size, parseSort(sort)))
                : chatMessageRepository.findByGuestToken(target.guestToken(), PageRequest.of(page, size, parseSort(sort)));

        return toMessagePageResponse(messagePage);
    }

    @Override
    @Transactional
    public ChatMessageResponse replyAsAdmin(AdminChatReplyRequest request) {
        ConversationTarget target = normalizeConversationTarget(request.getUserId(), request.getGuestToken());
        UserEntity user = target.userId() == null ? null : findUserById(target.userId());
        ChatMessageEntity chatMessage = chatMessageRepository.save(ChatMessageEntity.builder()
                .user(user)
                .guestToken(target.guestToken())
                .sender(SENDER_BOT)
                .message(cleanRequiredMessage(request.getMessage()))
                .build());

        if (user != null) {
            notificationService.createNotification(
                    user.getId(),
                    NOTIFICATION_TYPE_CHAT,
                    "Bạn có phản hồi mới từ bộ phận hỗ trợ",
                    "/chat"
            );
        }

        return chatMessageMapper.toChatMessageResponse(chatMessage);
    }

    private PageResponse<ChatMessageResponse> toMessagePageResponse(Page<ChatMessageEntity> messagePage) {
        return PageResponse.<ChatMessageResponse>builder()
                .content(messagePage.getContent().stream().map(chatMessageMapper::toChatMessageResponse).toList())
                .page(messagePage.getNumber())
                .size(messagePage.getSize())
                .totalElements(messagePage.getTotalElements())
                .totalPages(messagePage.getTotalPages())
                .last(messagePage.isLast())
                .build();
    }

    private ChatConversationResponse toConversationResponse(Object[] row) {
        Long userId = longValue(row[0]);
        String guestToken = stringValue(row[1]);

        return ChatConversationResponse.builder()
                .conversationKey(userId == null ? "guest:" + guestToken : "user:" + userId)
                .userId(userId)
                .guestToken(guestToken)
                .lastSender(stringValue(row[2]))
                .lastMessage(stringValue(row[3]))
                .lastMessageAt(localDateTimeValue(row[4]))
                .totalMessages(longValue(row[5]))
                .userName(stringValue(row[6]))
                .userEmail(stringValue(row[7]))
                .build();
    }

    private void notifyAdmins(String message, String link) {
        userRepository.findByRole_NameAndStatus(ROLE_ADMIN, UserStatus.active, Sort.by("id").ascending())
                .forEach(admin -> notificationService.createNotification(
                        admin.getId(),
                        NOTIFICATION_TYPE_CHAT,
                        message,
                        link
                ));
    }

    private ConversationTarget normalizeConversationTarget(Long userId, String guestToken) {
        String normalizedGuestToken = cleanBlank(guestToken);
        boolean hasUserId = userId != null;
        boolean hasGuestToken = normalizedGuestToken != null;

        if (hasUserId == hasGuestToken) {
            throw new BadRequestException("Cần truyền đúng một trong hai giá trị userId hoặc guestToken");
        }

        if (hasGuestToken && normalizedGuestToken.length() > 100) {
            throw new BadRequestException("guestToken không được vượt quá 100 ký tự");
        }

        return new ConversationTarget(userId, normalizedGuestToken);
    }

    private String normalizeRequiredGuestToken(String guestToken) {
        String normalizedGuestToken = cleanBlank(guestToken);
        if (normalizedGuestToken == null) {
            throw new BadRequestException("guestToken không được để trống");
        }

        if (normalizedGuestToken.length() > 100) {
            throw new BadRequestException("guestToken không được vượt quá 100 ký tự");
        }

        return normalizedGuestToken;
    }

    private String normalizeGuestTokenOrGenerate(String guestToken) {
        String normalizedGuestToken = cleanBlank(guestToken);
        if (normalizedGuestToken == null) {
            return "guest_" + UUID.randomUUID().toString().replace("-", "");
        }

        if (normalizedGuestToken.length() > 100) {
            throw new BadRequestException("guestToken không được vượt quá 100 ký tự");
        }

        return normalizedGuestToken;
    }

    private String normalizeOptionalSender(String sender) {
        String normalizedSender = cleanBlank(sender);
        if (normalizedSender == null) {
            return null;
        }

        normalizedSender = normalizedSender.toLowerCase(Locale.ROOT);
        if (!ALLOWED_SENDERS.contains(normalizedSender)) {
            throw new BadRequestException("sender không hợp lệ. Giá trị hợp lệ: user, bot");
        }

        return normalizedSender;
    }

    private Sort parseSort(String sort) {
        String cleanSort = cleanBlank(sort);
        if (cleanSort == null) {
            return Sort.by(Sort.Direction.ASC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id"));
        }

        String[] parts = cleanSort.split(",");
        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException("Trường sắp xếp không hợp lệ: " + field);
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new BadRequestException("Chiều sắp xếp không hợp lệ. Giá trị hợp lệ: asc, desc");
            }
        }

        return Sort.by(direction, field);
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page phải lớn hơn hoặc bằng 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size phải nằm trong khoảng 1 đến " + MAX_PAGE_SIZE);
        }
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }

    private String cleanRequiredMessage(String message) {
        String cleanMessage = cleanBlank(message);
        if (cleanMessage == null) {
            throw new BadRequestException("Nội dung tin nhắn không được để trống");
        }

        return cleanMessage;
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private Long longValue(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(value.toString());
    }

    private LocalDateTime localDateTimeValue(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }

        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }

        return LocalDateTime.parse(value.toString().replace(" ", "T"));
    }

    private record ConversationTarget(Long userId, String guestToken) {
    }
}
