package com.yisus.store_backend.storeconfig.model;

import com.yisus.store_backend.local.model.Local;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Configuración operativa y de branding de un local.
 */
@Entity
@Table(name = "store_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreConfig {

    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "local_id",
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Local local;

    @Column(name = "store_name", nullable = false)
    private String storeName;

    @Column(name = "store_ruc")
    private String storeRuc;

    @Column(name = "store_address")
    private String storeAddress;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "printer_name")
    private String printerName;

    @Column(name = "printer_ip")
    private String printerIp;

    @Column(name = "printer_port")
    private Integer printerPort;

    @Column(name = "printer_type")
    private String printerType;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
