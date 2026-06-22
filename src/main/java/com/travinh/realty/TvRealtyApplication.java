package com.travinh.realty;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TvRealtyApplication {

    public static void main(String[] args) {
        SpringApplication.run(TvRealtyApplication.class, args);
    }
}
