package com.travinh.realty.modules.property;

import com.travinh.realty.modules.property.dto.CategoryResponse;
import com.travinh.realty.modules.property.repository.CategoryRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/categories")
public class CategoryController {
    private final CategoryRepository categories;

    public CategoryController(CategoryRepository categories) {
        this.categories = categories;
    }

    @GetMapping
    public List<CategoryResponse> all() {
        return categories.findAll().stream().map(CategoryResponse::from).toList();
    }
}
