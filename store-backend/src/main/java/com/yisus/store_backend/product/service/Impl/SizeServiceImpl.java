package com.yisus.store_backend.product.service.Impl;

import com.yisus.store_backend.product.dto.SizeCreateDTO;
import com.yisus.store_backend.product.dto.SizeDTO;
import com.yisus.store_backend.product.dto.SizeUpdateDTO;
import com.yisus.store_backend.product.model.Size;
import com.yisus.store_backend.product.repository.SizeRepository;
import com.yisus.store_backend.product.service.SizeService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SizeServiceImpl implements SizeService {
    
    private final SizeRepository sizeRepository;
    
    @Override
    @Transactional
    public SizeDTO createSize(SizeCreateDTO sizeCreateDTO) {
        // Si ya existe una talla con ese nombre, decidir según su estado:
        // - Activa   -> duplicado real, rechazar.
        // - Inactiva (soft-deleted) -> reactivar para evitar chocar con la
        //   restricción UNIQUE en la columna name.
        var existingOpt = sizeRepository.findByName(sizeCreateDTO.getName());
        if (existingOpt.isPresent()) {
            Size existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                throw new DuplicateKeyException("Size already exists");
            }
            existing.setIsActive(true);
            Size reactivated = sizeRepository.save(existing);
            sizeRepository.flush();
            return convertToDTO(reactivated);
        }

        Size size = Size.builder()
                .name(sizeCreateDTO.getName())
                .build();

        Size savedSize = sizeRepository.save(size);
        sizeRepository.flush();
        return convertToDTO(savedSize);
    }
    
    @Override
    @Transactional
    public SizeDTO updateSize(Long id, SizeUpdateDTO sizeUpdateDTO) {
        Size size = sizeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Size not found"));
        
        if (sizeUpdateDTO.getName() != null) {
            sizeRepository.findByName(sizeUpdateDTO.getName())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new DuplicateKeyException("Size already exists");
                        }
                    });
            size.setName(sizeUpdateDTO.getName());
        }
        
        Size savedSize = sizeRepository.save(size);
        sizeRepository.flush();
        return convertToDTO(savedSize);
    }
    
    @Override
    @Transactional
    public void deleteSize(Long id) {
        Size size = sizeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Size not found"));
        size.setIsActive(false);
        sizeRepository.save(size);
    }
    
    @Override
    @Transactional(readOnly = true)
    public SizeDTO getSizeById(Long id) {
        Size size = sizeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Size not found"));
        return convertToDTO(size);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<SizeDTO> getAllSizes() {
        return sizeRepository.findAllByIsActiveTrue().stream()
                .map(this::convertToDTO)
                .toList();
    }
    
    private SizeDTO convertToDTO(Size size) {
        return SizeDTO.builder()
                .id(size.getId())
                .name(size.getName())
                .isActive(size.getIsActive())
                .createdAt(size.getCreatedAt())
                .updatedAt(size.getUpdatedAt())
                .build();
    }
}
