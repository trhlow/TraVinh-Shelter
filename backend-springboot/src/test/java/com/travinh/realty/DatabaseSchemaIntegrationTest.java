package com.travinh.realty;

import static org.assertj.core.api.Assertions.assertThat;

import com.travinh.realty.modules.property.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class DatabaseSchemaIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tv_realty_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void migrationsCreateJsonbSchemaAndSeedCategories() {
        String attributesType = jdbcTemplate.queryForObject("""
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'attributes'
                """, String.class);
        Integer savedPropertiesPrimaryKeyColumns = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = 'public' AND t.relname = 'saved_properties' AND c.contype = 'p'
                """, Integer.class);

        assertThat(attributesType).isEqualTo("jsonb");
        assertThat(savedPropertiesPrimaryKeyColumns).isEqualTo(1);
        assertThat(categoryRepository.findAll()).extracting(category -> category.getSlug())
                .containsExactlyInAnyOrder("tro", "nha", "dat");
    }
}
