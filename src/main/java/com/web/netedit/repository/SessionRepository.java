package com.web.netedit.repository;

import com.web.netedit.entity.SessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<SessionEntity, String> {

    @Query(value="SELECT DISTINCT SESSION_SUFFIX FROM NETEDIT_USER_SESSION", nativeQuery=true)
    List<String> findDistinctSessionSuffix();

}
