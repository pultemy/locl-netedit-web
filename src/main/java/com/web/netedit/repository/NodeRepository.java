package com.web.netedit.repository;

import com.web.netedit.entity.NodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NodeRepository extends JpaRepository<NodeEntity, String> {
}
