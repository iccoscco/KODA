package com.yisus.store_backend.notification.repository;

import com.yisus.store_backend.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdAndLocal_IdOrderByCreatedAtDesc(
            Long userId, Long localId, Pageable pageable);

    Page<Notification> findByUserIdAndLocal_IdAndIsReadFalseOrderByCreatedAtDesc(
            Long userId, Long localId, Pageable pageable);

    List<Notification> findTop10ByUserIdAndLocal_IdOrderByCreatedAtDesc(Long userId, Long localId);

    long countByUserIdAndLocal_IdAndIsReadFalse(Long userId, Long localId);

    java.util.Optional<Notification> findByIdAndUserIdAndLocal_Id(
            Long id, Long userId, Long localId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId " +
            "AND n.local.id = :localId AND n.isRead = false")
    void markAllAsReadByUserIdAndLocalId(@Param("userId") Long userId, @Param("localId") Long localId);
}
