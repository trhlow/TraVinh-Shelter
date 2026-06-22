package com.travinh.realty.modules.admin.repository;

import com.travinh.realty.modules.admin.model.Report;
import com.travinh.realty.modules.admin.model.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);
}
