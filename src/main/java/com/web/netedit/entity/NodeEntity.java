package com.web.netedit.entity;

import lombok.*;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "NETEDIT_MS_NODE_2020")
public class NodeEntity {

    @Id
    @Column(name = "NODE_ID")
    private String NODE_ID;

    private String NODE_TYPE;
    private String TRAFFIC_LIGHT;
    private String NODE_NAME;
    private String DISTRICT_ID;
    private String DISTRICT_ID2;
    private String WKT;

    private String USE_YN;
    private String EDIT_YN;

    public void setAll(NodeEntity _nodeEntity) {

        if (_nodeEntity.NODE_TYPE != null) {
            this.NODE_TYPE = _nodeEntity.NODE_TYPE;
        }

        if (_nodeEntity.TRAFFIC_LIGHT != null) {
            this.TRAFFIC_LIGHT = _nodeEntity.TRAFFIC_LIGHT;
        }

        if (_nodeEntity.NODE_NAME != null) {
            this.NODE_NAME = _nodeEntity.NODE_NAME;
        }

        if (_nodeEntity.DISTRICT_ID != null) {
            this.DISTRICT_ID = _nodeEntity.DISTRICT_ID;
        }

        if (_nodeEntity.DISTRICT_ID2 != null) {
            this.DISTRICT_ID2 = _nodeEntity.DISTRICT_ID2;
        }

        this.WKT = _nodeEntity.WKT;

        this.USE_YN = _nodeEntity.USE_YN != null ? _nodeEntity.USE_YN : "Y";

        if (_nodeEntity.EDIT_YN != null) {
            this.EDIT_YN = _nodeEntity.EDIT_YN;
        }

    }

}
