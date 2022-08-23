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
@Table(name = "NETEDIT_MS_FACILITY_2020")
public class FacilityEntity {

    @Id
    @Column(name = "FAC_ID")
    private String FAC_ID;

    private String FAC_TY;
    private String WKT;
    private String USE_YN;

    private String EDIT_YN;

    public void setAll(FacilityEntity _facilityEntity) {
        if (_facilityEntity.FAC_TY != null) {
            this.FAC_TY = _facilityEntity.FAC_TY;
        }

        this.WKT = _facilityEntity.WKT;

        if (_facilityEntity.USE_YN != null) {
            this.USE_YN = _facilityEntity.USE_YN;
        }

        if (_facilityEntity.EDIT_YN != null) {
            this.EDIT_YN = _facilityEntity.EDIT_YN;
        }
    }

}
