package com.yisus.store_backend.category.service.Impl;

import com.yisus.store_backend.category.dto.CategoryCreateDTO;
import com.yisus.store_backend.category.dto.CategoryDTO;
import com.yisus.store_backend.category.dto.CategoryUpdateDTO;
import com.yisus.store_backend.category.model.Category;
import com.yisus.store_backend.category.repository.CategoryRepository;
import com.yisus.store_backend.category.service.CategoryService;
import com.yisus.store_backend.product.repository.ProductRepository;
import com.yisus.store_backend.product.repository.ProductVariantRepository;
import com.yisus.store_backend.common.exception.DuplicateResourceException;
import com.yisus.store_backend.common.exception.ResourceNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryServiceImpl implements CategoryService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    @Override
    @Transactional
    public CategoryDTO createCategory(CategoryCreateDTO request) {
        // Si ya existe una categoría con ese nombre, decidir según su estado:
        // - Activa   -> duplicado real, rechazar.
        // - Inactiva (soft-deleted) -> reactivar con los nuevos datos para evitar
        //   chocar con la restricción UNIQUE en la columna name.
        var existingOpt = categoryRepository.findByName(request.getName());
        if (existingOpt.isPresent()) {
            Category existing = existingOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive())) {
                log.warn("Category '{}' already exists", request.getName());
                throw new DuplicateResourceException("Category '" + request.getName() + "' already exists");
            }

            existing.setDescription(request.getDescription());
            existing.setIsActive(true);
            categoryRepository.save(existing);
            categoryRepository.flush();
            log.info("Category '{}' reactivated and updated successfully", existing.getName());
            return convertToDTO(existing, 0L, 0L, 0L);
        }

        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .isActive(true)
                .build();
        categoryRepository.save(category);
        categoryRepository.flush();
        log.info("Category '{}' created successfully", request.getName());
        return convertToDTO(category, 0L, 0L, 0L);
    }

    @Override
    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryUpdateDTO request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        categoryRepository.findByName(request.getName())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new DuplicateResourceException("Category '" + request.getName() + "' already exists");
                    }
                });

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        categoryRepository.save(category);
        categoryRepository.flush();
        Category refreshed = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        long catId = refreshed.getId();
        return convertToDTO(
                refreshed,
                productRepository.countByCategory_IdAndIsActiveTrue(catId),
                productVariantRepository.countByProductCategoryId(catId),
                productVariantRepository.sumStockByProductCategoryId(catId));
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        long activeProducts = productRepository.countByCategory_IdAndIsActiveTrue(id);
        if (activeProducts > 0) {
            throw new IllegalStateException(
                "No se puede eliminar la categoría '" + category.getName() + "' porque tiene " +
                activeProducts + " producto(s) activo(s) asociado(s). " +
                "Elimina o reasigna los productos primero.");
        }

        category.setIsActive(false);
        categoryRepository.save(category);
        log.info("Category '{}' deleted (deactivated) successfully", category.getName());
    }

    @Override
    @Transactional
    public void updateStatus(Long id, Boolean isActive) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        category.setIsActive(isActive);
        categoryRepository.save(category);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        long catId = category.getId();
        return convertToDTO(
                category,
                productRepository.countByCategory_IdAndIsActiveTrue(catId),
                productVariantRepository.countByProductCategoryId(catId),
                productVariantRepository.sumStockByProductCategoryId(catId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryDTO> getAllCategories(String search){
        if(search == null || search.trim().isEmpty()){
            List<Category> categories = categoryRepository.findAllByIsActiveTrue();
            List<Long> ids = categories.stream().map(Category::getId).toList();
            Map<Long, Long> productCounts = productCountsByCategoryIds(ids);
            Map<Long, VariantTotals> variantTotals = variantTotalsByCategoryIds(ids);
            return categories.stream()
                    .map(c -> {
                        VariantTotals vt = variantTotals.getOrDefault(c.getId(), VariantTotals.ZERO);
                        return convertToDTO(
                                c,
                                productCounts.getOrDefault(c.getId(), 0L),
                                vt.variantCount(),
                                vt.totalStock());
                    })
                    .toList();
        }
        List<Category> categories = categoryRepository.findBySearch(search);
        List<Long> ids = categories.stream().map(Category::getId).toList();
        Map<Long, Long> productCounts = productCountsByCategoryIds(ids);
        Map<Long, VariantTotals> variantTotals = variantTotalsByCategoryIds(ids);
        return categories.stream()
                .map(c -> {
                    VariantTotals vt = variantTotals.getOrDefault(c.getId(), VariantTotals.ZERO);
                    return convertToDTO(
                            c,
                            productCounts.getOrDefault(c.getId(), 0L),
                            vt.variantCount(),
                            vt.totalStock());
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CategoryDTO> getAllCategoriesPaginated(String search, Pageable pageable) {
        Page<Category> page = (search == null || search.trim().isEmpty())
                ? categoryRepository.findAllByIsActiveTrue(pageable)
                : categoryRepository.findBySearch(search, pageable);
        List<Long> ids = page.getContent().stream().map(Category::getId).toList();
        Map<Long, Long> productCounts = productCountsByCategoryIds(ids);
        Map<Long, VariantTotals> variantTotals = variantTotalsByCategoryIds(ids);
        List<CategoryDTO> content = page.getContent().stream()
                .map(c -> {
                    VariantTotals vt = variantTotals.getOrDefault(c.getId(), VariantTotals.ZERO);
                    return convertToDTO(
                            c,
                            productCounts.getOrDefault(c.getId(), 0L),
                            vt.variantCount(),
                            vt.totalStock());
                })
                .toList();
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    private Map<Long, Long> productCountsByCategoryIds(List<Long> categoryIds) {
        if (categoryIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : productRepository.countProductsGroupedByCategoryIds(categoryIds)) {
            map.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    private Map<Long, VariantTotals> variantTotalsByCategoryIds(List<Long> categoryIds) {
        if (categoryIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, VariantTotals> map = new HashMap<>();
        for (Object[] row : productVariantRepository.variantAggregatesGroupedByCategoryIds(categoryIds)) {
            map.put(
                    (Long) row[0],
                    new VariantTotals(
                            ((Number) row[1]).longValue(),
                            ((Number) row[2]).longValue()));
        }
        return map;
    }

    private CategoryDTO convertToDTO(Category category, long productCount, long variantCount, long totalStock) {
        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .isActive(category.getIsActive())
                .productCount(productCount)
                .variantCount(variantCount)
                .totalStock(totalStock)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    private record VariantTotals(long variantCount, long totalStock) {
        static final VariantTotals ZERO = new VariantTotals(0L, 0L);
    }
}
