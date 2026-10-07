package com.yisus.store_backend.product.service;

import com.yisus.store_backend.product.dto.SizeCreateDTO;
import com.yisus.store_backend.product.dto.SizeDTO;
import com.yisus.store_backend.product.dto.SizeUpdateDTO;

import java.util.List;

public interface SizeService {
    SizeDTO createSize(SizeCreateDTO sizeCreateDTO);
    SizeDTO updateSize(Long id, SizeUpdateDTO sizeUpdateDTO);
    void deleteSize(Long id);
    SizeDTO getSizeById(Long id);
    List<SizeDTO> getAllSizes();
}
