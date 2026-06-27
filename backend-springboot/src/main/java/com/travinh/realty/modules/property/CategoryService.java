package com.travinh.realty.modules.property;

import com.travinh.realty.modules.property.dto.CategoryResponse;
import com.travinh.realty.modules.property.repository.CategoryRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {
    private final CategoryRepository categories;

    public CategoryService(CategoryRepository categories) {
        this.categories = categories;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> all() {
        return categories.findAll().stream().map(CategoryResponse::from).toList();
    }
}
