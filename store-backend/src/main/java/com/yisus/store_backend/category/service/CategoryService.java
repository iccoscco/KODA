package com.yisus.store_backend.category.service;

import com.yisus.store_backend.category.dto.CategoryCreateDTO;
import com.yisus.store_backend.category.dto.CategoryDTO;
import com.yisus.store_backend.category.dto.CategoryUpdateDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CategoryService {
    CategoryDTO createCategory(CategoryCreateDTO request);
    CategoryDTO updateCategory(Long id, CategoryUpdateDTO request);
    void deleteCategory(Long id);
    void updateStatus(Long id, Boolean isActive);
    CategoryDTO getCategoryById(Long id);
    List<CategoryDTO> getAllCategories(String search);
    Page<CategoryDTO> getAllCategoriesPaginated(String search, Pageable pageable);
}
