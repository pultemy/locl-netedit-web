package com.web.netedit.api;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class NetworkDAO {

    private static final String NAMESPACE = "com.web.netedit.networks.";

    private SqlSessionTemplate sqlSessionTemplate = null;

    @Autowired
    public NetworkDAO(SqlSessionTemplate sqlSessionTemplate) {
        this.sqlSessionTemplate = sqlSessionTemplate;
    }

    public List<Map<String, Object>> connectionTest() {
        String queryId = "connectionTest";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId);
    }

    public List<Map<String, Object>> getLink() {
        String queryId = "getLink";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId);
    }

    public List<Map<String, Object>> getLinkByZone(Map map) {
        String queryId = "getLinkByZone";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId, map);
    }

    public List<Map<String, Object>> getFacilityByZone(Map map) {
        String queryId = "getFacilityByZone";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId, map);
    }

    public List<Map<String, Object>> getNodeByZone(Map map) {
        String queryId = "getNodeByZone";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId, map);
    }

    public List<Map<String, Object>> getNode(Map map) {
        String queryId = "getNode";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId, map);
    }

    public List<Map<String, Object>> getRcline(Map map) {
        String queryId = "getRcline";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId, map);
    }

    public List<Map<String, Object>> getTurn() {
        String queryId = "getTurn";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId);
    }

    public Map<String, Object> getSingleLink(Map map) {
        String queryId = "getSingleLink";
        return sqlSessionTemplate.selectOne(NAMESPACE + queryId, map);
    }

    public List<Map<String, Object>> getSmInter() {
        String queryId = "getSmInter";
        return sqlSessionTemplate.selectList(NAMESPACE + queryId);
    }

    public int updateGeometry() {
        String queryId = "updateLinkGeometry";
        int linkUpdateRows = sqlSessionTemplate.update(NAMESPACE + queryId);
        queryId = "updateNodeGeometry";
        int nodeUpdateRows = sqlSessionTemplate.update(NAMESPACE + queryId);
        queryId = "updateFacGeometry";
        int facUpdateRows = sqlSessionTemplate.update(NAMESPACE + queryId);
        return linkUpdateRows + nodeUpdateRows + facUpdateRows;
    }

}
