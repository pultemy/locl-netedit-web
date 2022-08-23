package com.web.netedit.entity;


import lombok.*;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "NETEDIT_USER_SESSION")
public class SessionEntity {

    @Id
    @Column(name = "UUID")
    private String uuid;

    @Column(name = "SESSION_ID")
    private String sessionId;

    @Column(name = "LAST_ACTIVE_TM")
    private java.sql.Timestamp lastActiveTm;

    @Column(name = "ACTIVE_YN")
    private String activeYn;

    @Column(name = "SESSION_SUFFIX")
    private String sessionSuffix;


}
