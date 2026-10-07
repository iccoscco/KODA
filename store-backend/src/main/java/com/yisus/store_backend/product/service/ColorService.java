package com.yisus.store_backend.product.service;

import com.yisus.store_backend.product.dto.ColorCreateDTO;
import com.yisus.store_backend.product.dto.ColorDTO;
import com.yisus.store_backend.product.dto.ColorUpdateDTO;

import java.util.List;

public interface ColorService {
    ColorDTO createColor(ColorCreateDTO colorCreateDTO);
    ColorDTO updateColor(Long id, ColorUpdateDTO colorUpdateDTO);
    void deleteColor(Long id);
    ColorDTO getColorById(Long id);
    List<ColorDTO> getAllColors();
}
