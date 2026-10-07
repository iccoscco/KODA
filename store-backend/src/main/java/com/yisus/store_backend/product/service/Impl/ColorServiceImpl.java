package com.yisus.store_backend.product.service.Impl;

import com.yisus.store_backend.product.dto.ColorCreateDTO;
import com.yisus.store_backend.product.dto.ColorDTO;
import com.yisus.store_backend.product.dto.ColorUpdateDTO;
import com.yisus.store_backend.product.model.Color;
import com.yisus.store_backend.product.repository.ColorRepository;
import com.yisus.store_backend.product.service.ColorService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ColorServiceImpl implements ColorService {
    
    private final ColorRepository colorRepository;
    
    @Override
    @Transactional
    public ColorDTO createColor(ColorCreateDTO colorCreateDTO) {
        // Si ya existe un color con ese nombre, decidir según su estado:
        // - Activo   -> duplicado real, rechazar.
        // - Inactivo (soft-deleted) -> reactivar con los nuevos datos para
        //   evitar chocar con la restricción UNIQUE en la columna name.
        var existingOpt = colorRepository.findByName(colorCreateDTO.getName());
        if (existingOpt.isPresent()) {
            Color existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new DuplicateKeyException("Color already exists");
            }
            existing.setHexCode(colorCreateDTO.getHexCode());
            existing.setIsActive(true);
            Color reactivated = colorRepository.save(existing);
            colorRepository.flush();
            return convertToDTO(reactivated);
        }

        Color color = Color.builder()
                .name(colorCreateDTO.getName())
                .hexCode(colorCreateDTO.getHexCode())
                .build();

        Color savedColor = colorRepository.save(color);
        colorRepository.flush();
        return convertToDTO(savedColor);
    }
    
    @Override
    @Transactional
    public ColorDTO updateColor(Long id, ColorUpdateDTO colorUpdateDTO) {
        Color color = colorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Color not found"));
        
        if (colorUpdateDTO.getName() != null) {
            colorRepository.findByName(colorUpdateDTO.getName())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new DuplicateKeyException("Color already exists");
                        }
                    });
            color.setName(colorUpdateDTO.getName());
        }
        
        if (colorUpdateDTO.getHexCode() != null) {
            color.setHexCode(colorUpdateDTO.getHexCode());
        }
        
        Color savedColor = colorRepository.save(color);
        colorRepository.flush();
        return convertToDTO(savedColor);
    }
    
    @Override
    @Transactional
    public void deleteColor(Long id) {
        Color color = colorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Color not found"));
        color.setIsActive(false);
        colorRepository.save(color);
    }
    
    @Override
    @Transactional(readOnly = true)
    public ColorDTO getColorById(Long id) {
        Color color = colorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Color not found"));
        return convertToDTO(color);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ColorDTO> getAllColors() {
        return colorRepository.findAllByIsActiveTrue().stream()
                .map(this::convertToDTO)
                .toList();
    }
    
    private ColorDTO convertToDTO(Color color) {
        return ColorDTO.builder()
                .id(color.getId())
                .name(color.getName())
                .hexCode(color.getHexCode())
                .isActive(color.getIsActive())
                .createdAt(color.getCreatedAt())
                .updatedAt(color.getUpdatedAt())
                .build();
    }
}
