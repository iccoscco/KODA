package com.yisus.store_backend.product.service;

import com.yisus.store_backend.product.dto.ProductCreateDTO;
import com.yisus.store_backend.product.dto.ProductDTO;
import com.yisus.store_backend.product.dto.ProductUpdateDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductService {
    ProductDTO createProduct(ProductCreateDTO request);
    ProductDTO updateProduct(Long id, ProductUpdateDTO request);
    void deleteProduct(Long id);
    void updateProductStatus(Long id, Boolean isActive);
    ProductDTO getProductById(Long id);
    List<ProductDTO> getAllProducts(String search);
    Page<ProductDTO> getAllProductsPaginated(String search, Pageable pageable);
    List<ProductDTO> getProductsByCategoryId(Long categoryId);
}
