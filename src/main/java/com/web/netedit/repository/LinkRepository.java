package com.web.netedit.repository;

import com.web.netedit.entity.LinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LinkRepository extends JpaRepository<LinkEntity, String> {



}
