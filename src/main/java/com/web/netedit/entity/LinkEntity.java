package com.web.netedit.entity;

import lombok.*;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.sql.Timestamp;
import java.util.Map;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "NETEDIT_MS_LINK_2020")
public class LinkEntity {

    @Id
    @Column(name = "LINK_ID")
    private String LINK_ID;

    private String UP_FROM_NODE;
    private String UP_TO_NODE;
    private String UP_LANES;

    private String DOWN_FROM_NODE;
    private String DOWN_TO_NODE;
    private String DOWN_LANES;

    private String EDIT_TY;

    private String ROAD_NAME;
    private String FIRST_DO;
    private String FIRST_GU;
    private String LANE_CHANGE;
    private String EX_POCKET_NUM;
    private String WKT;

    private String USE_YN;

    private String USER_1;
    private String USER_2;
    private String USER_3;
    private String USER_4;

    private String LEFT_TURN_UP_DOWN;
    private String EDIT_YN;

    private String ROAD_RANK;
    private String FACILITY_KIND;

    private String NAVI_LV;
    private String KOTI_LV;
    private String LEN;
    private String ST_DIR;
    private String ED_DIR;
    private String LINK_CATEGORY;
    private String ONEWAY;
    private String WDTH;
    private String LANES;
    private String TOLL_NAME;
    private String ROAD_FACILITY_NAME;
    private String ROAD_NO;
    private String HOV_BUSLANE;
    private String SHOV_BUSLANE;
    private String AUTOEXCUSIVE;
    private String NUM_CROSS;
    private String BARRIER;
    private String MAXSPEED;
    private String TL_DENSITY;
    private String TRAF_ID_P;
    private String TRAF_ID_N;

    private java.sql.Timestamp LAST_UPDATE_TM;

    public void setAll(LinkEntity _linkEntity) {

        if (_linkEntity.UP_FROM_NODE != null) {
            this.UP_FROM_NODE = _linkEntity.UP_FROM_NODE;
        }
        if (_linkEntity.UP_TO_NODE != null) {
            this.UP_TO_NODE = _linkEntity.UP_TO_NODE;
        }
        if (_linkEntity.UP_LANES != null) {
            this.UP_LANES = _linkEntity.UP_LANES;
        }

        if (_linkEntity.DOWN_FROM_NODE != null) {
            this.DOWN_FROM_NODE = _linkEntity.DOWN_FROM_NODE;
        }

        if (_linkEntity.DOWN_TO_NODE != null) {
            this.DOWN_TO_NODE = _linkEntity.DOWN_TO_NODE;
        }

        if (_linkEntity.DOWN_LANES != null) {
            this.DOWN_LANES = _linkEntity.DOWN_LANES;
        }

        if (!_linkEntity.EDIT_TY.equals("") && _linkEntity.EDIT_TY != null) {
            this.EDIT_TY = _linkEntity.EDIT_TY;
        } else {
            this.EDIT_TY = null;
        }

        if (_linkEntity.ROAD_NAME != null) {
            this.ROAD_NAME = _linkEntity.ROAD_NAME;
        }

        if (_linkEntity.FIRST_DO != null) {
            this.FIRST_DO = _linkEntity.FIRST_DO;
        }

        if (_linkEntity.FIRST_GU != null) {
            this.FIRST_GU = _linkEntity.FIRST_GU;
        }

        if (_linkEntity.LANE_CHANGE != null) {
            this.LANE_CHANGE = _linkEntity.LANE_CHANGE;
        }

        if (_linkEntity.EX_POCKET_NUM != null) {
            this.EX_POCKET_NUM = _linkEntity.EX_POCKET_NUM;
        }

        this.WKT = _linkEntity.WKT;

        if (_linkEntity.USE_YN.equals("Y")) {
            this.USE_YN = "Y";
        } else {
            this.USE_YN = "N";
        }

        if (_linkEntity.USER_1 != null) {
            this.USER_1 = _linkEntity.USER_1;
        }

        if (_linkEntity.USER_2 != null) {
            this.USER_2 = _linkEntity.USER_2;
        }

        if (_linkEntity.USER_3 != null) {
            this.USER_3 = _linkEntity.USER_3;
        }

        if (_linkEntity.USER_4 != null) {
            this.USER_4 = _linkEntity.USER_4;
        }

        if (_linkEntity.LEFT_TURN_UP_DOWN != null) {
            this.LEFT_TURN_UP_DOWN = _linkEntity.LEFT_TURN_UP_DOWN;
        }

        if (_linkEntity.EDIT_YN != null) {
            this.EDIT_YN = _linkEntity.EDIT_YN;
        }

        if (_linkEntity.ROAD_RANK != null) {
            this.ROAD_RANK = _linkEntity.ROAD_RANK;
        }

        if (_linkEntity.FACILITY_KIND != null) {
            this.FACILITY_KIND = _linkEntity.FACILITY_KIND;
        }

        if (_linkEntity.NAVI_LV != null) {
            this.NAVI_LV = _linkEntity.NAVI_LV;
        }

        if (_linkEntity.KOTI_LV != null) {
            this.KOTI_LV = _linkEntity.KOTI_LV;
        }

        if (_linkEntity.LEN != null) {
            this.LEN = _linkEntity.LEN;
        }

        if (_linkEntity.ST_DIR != null) {
            this.ST_DIR = _linkEntity.ST_DIR;
        }

        if (_linkEntity.ED_DIR != null) {
            this.ED_DIR = _linkEntity.ED_DIR;
        }

        if (_linkEntity.LINK_CATEGORY != null) {
            this.LINK_CATEGORY = _linkEntity.LINK_CATEGORY;
        }

        if (_linkEntity.ONEWAY != null) {
            this.ONEWAY = _linkEntity.ONEWAY;
        }

        if (_linkEntity.WDTH != null) {
            this.WDTH = _linkEntity.WDTH;
        }

        if (_linkEntity.LANES != null) {
            this.LANES = _linkEntity.LANES;
        }

        if (_linkEntity.TOLL_NAME != null) {
            this.TOLL_NAME = _linkEntity.TOLL_NAME;
        }

        if (_linkEntity.ROAD_FACILITY_NAME != null) {
            this.ROAD_FACILITY_NAME = _linkEntity.ROAD_FACILITY_NAME;
        }

        if (_linkEntity.ROAD_NO != null) {
            this.ROAD_NO = _linkEntity.ROAD_NO;
        }

        if (_linkEntity.HOV_BUSLANE != null) {
            this.HOV_BUSLANE = _linkEntity.HOV_BUSLANE;
        }

        if (_linkEntity.SHOV_BUSLANE != null) {
            this.SHOV_BUSLANE = _linkEntity.SHOV_BUSLANE;
        }

        if (_linkEntity.AUTOEXCUSIVE != null) {
            this.AUTOEXCUSIVE = _linkEntity.AUTOEXCUSIVE;
        }

        if (_linkEntity.SHOV_BUSLANE != null) {
            this.SHOV_BUSLANE = _linkEntity.SHOV_BUSLANE;
        }

        if (_linkEntity.NUM_CROSS != null) {
            this.NUM_CROSS = _linkEntity.NUM_CROSS;
        }

        if (_linkEntity.BARRIER != null) {
            this.BARRIER = _linkEntity.BARRIER;
        }

        if (_linkEntity.MAXSPEED != null) {
            this.MAXSPEED = _linkEntity.MAXSPEED;
        }

        if (_linkEntity.BARRIER != null) {
            this.BARRIER = _linkEntity.BARRIER;
        }

        if (_linkEntity.TL_DENSITY != null) {
            this.TL_DENSITY = _linkEntity.TL_DENSITY;
        }

        if (_linkEntity.TRAF_ID_P != null) {
            this.TRAF_ID_P = _linkEntity.TRAF_ID_P;
        }

        if (_linkEntity.TRAF_ID_N != null) {
            this.TRAF_ID_N = _linkEntity.TRAF_ID_N;
        }

        if (_linkEntity.LAST_UPDATE_TM != null) {
            this.LAST_UPDATE_TM = new Timestamp(System.currentTimeMillis());
        } else {
            this.LAST_UPDATE_TM = new Timestamp(System.currentTimeMillis());
        }

    }
}
