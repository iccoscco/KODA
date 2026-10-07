package com.yisus.store_backend.storeconfig.service;

import com.yisus.store_backend.storeconfig.dto.StoreConfigBrandingDTO;
import com.yisus.store_backend.storeconfig.dto.StoreConfigDTO;
import com.yisus.store_backend.storeconfig.dto.StoreConfigUpdateDTO;
import com.yisus.store_backend.storeconfig.model.StoreConfig;
import org.springframework.web.multipart.MultipartFile;

public interface StoreConfigService {
    StoreConfigDTO getConfig();
    StoreConfig getRawConfig();
    StoreConfigDTO updateConfig(StoreConfigUpdateDTO dto);
    StoreConfigBrandingDTO getBranding();
    StoreConfigDTO uploadLogo(MultipartFile file);
    StoreConfigDTO deleteLogo();
    void testPrinterConnection(String ip, int port);
}
