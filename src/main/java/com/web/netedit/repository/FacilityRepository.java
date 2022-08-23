package com.web.netedit.repository;

import com.web.netedit.entity.FacilityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FacilityRepository extends JpaRepository<FacilityEntity, String> {
}
