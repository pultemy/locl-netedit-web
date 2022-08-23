package com.web.netedit.api;

import com.web.netedit.entity.FacilityEntity;
import com.web.netedit.entity.LinkEntity;
import com.web.netedit.entity.NodeEntity;
import com.web.netedit.repository.FacilityRepository;
import com.web.netedit.repository.LinkRepository;
import com.web.netedit.repository.NodeRepository;
import com.web.netedit.util.NetworkUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.*;

@Service
public class NetworkService {

    private final NetworkDAO networkDAO;

    private final LinkRepository linkRepository;
    private final NodeRepository nodeRepository;
    private final FacilityRepository facilityRepository;

    @Autowired
    public NetworkService(NetworkDAO networkDAO, LinkRepository linkRepository, NodeRepository nodeRepository, FacilityRepository facilityRepository) {
        this.networkDAO = networkDAO;
        this.linkRepository = linkRepository;
        this.nodeRepository = nodeRepository;
        this.facilityRepository = facilityRepository;
    }

    public List<Map<String, Object>> connectionTest() {
        return networkDAO.connectionTest();
    }

    public List<Map<String, Object>> getLink() {
        return networkDAO.getLink();
    }

    public List<Map<String, Object>> getLinkByZone(String wkt, List<String> sggCode) {
        Map<String, Object> map = new HashMap<>();
        map.put("WKT", wkt);
        map.put("SGG_CODE", sggCode);
        return networkDAO.getLinkByZone(map);
    }

    public List<Map<String, Object>> getFacilityByZone(String wkt, List<String> sggCode) {
        Map<String, Object> map = new HashMap<>();
        map.put("WKT", wkt);
        map.put("SGG_CODE", sggCode);
        return networkDAO.getFacilityByZone(map);
    }

    public List<Map<String, Object>> getNodeByLink(String wkt, List<String> sggCode) {
        Map<String, Object> map = new HashMap<>();
        map.put("WKT", wkt);
        map.put("SGG_CODE", sggCode);
        return networkDAO.getNodeByZone(map);
    }

    public List<Map<String, Object>> getNode(String _fromNode, String _toNode) {
        Map<String, Object> map = new HashMap<>();
        map.put("FROM_NODE", _fromNode);
        map.put("TO_NODE", _toNode);
        return networkDAO.getNode(map);
    }

    public List<Map<String, Object>> getRcline(String wkt, List<String> sggCode) {
        Map<String, Object> map = new HashMap<>();
        map.put("WKT", wkt);
        map.put("SGG_CODE", sggCode);
        return networkDAO.getRcline(map);
    }

    public List<Map<String, Object>> getTurn() {
        return networkDAO.getTurn();
    }

    public LinkEntity controlLinkData(Map<String, Object> _linkDataRepo) {
        NetworkUtil util = new NetworkUtil();

        LinkEntity newLinkEntity = new LinkEntity();
        newLinkEntity = (LinkEntity) util.convertMapToObject(_linkDataRepo, newLinkEntity);
        newLinkEntity.setUSE_YN("Y");
        newLinkEntity.setLAST_UPDATE_TM(new Timestamp(System.currentTimeMillis()));

        Optional<LinkEntity> originLinkEntity = linkRepository.findById((String) _linkDataRepo.get("LINK_ID"));

        if (originLinkEntity.isPresent()) {
            originLinkEntity.get().setAll(newLinkEntity);
            linkRepository.save(originLinkEntity.get());
            return originLinkEntity.get();
        } else {
            linkRepository.save(newLinkEntity);
            return newLinkEntity;
        }

    }

    public NodeEntity controlNodeData(Map<String, Object> _nodeDataRepo) {
        NetworkUtil util = new NetworkUtil();

        NodeEntity newNodeEntity = new NodeEntity();
        newNodeEntity = (NodeEntity) util.convertMapToObject(_nodeDataRepo, newNodeEntity);
        newNodeEntity.setUSE_YN("Y");

        Optional<NodeEntity> originNodeEntity = nodeRepository.findById((String) _nodeDataRepo.get("NODE_ID"));

        if (originNodeEntity.isPresent()) {
            originNodeEntity.get().setAll(newNodeEntity);
            nodeRepository.save(originNodeEntity.get());
            return originNodeEntity.get();
        } else {
            nodeRepository.save(newNodeEntity);
            return newNodeEntity;
        }
    }

    public List<NodeEntity> getNodeGroup(List<String> nodes) {
        List<NodeEntity> nodeEntityList = new ArrayList<>();

        for (String node : nodes) {
            Optional<NodeEntity> nodeEntity = nodeRepository.findById(node);
            if (nodeEntity.isPresent()) {
                nodeEntityList.add(nodeEntity.get());
            }
        }

        return nodeEntityList;
    }

    public Map<String, Object> deleteData(String id, String dataType) {
        Map<String, Object> map = new HashMap<>();

        switch (dataType) {
            case "LINK":
                Optional<LinkEntity> linkEntity = linkRepository.findById(id);
                if (linkEntity.isPresent()) {
                    linkEntity.get().setUSE_YN("N");
                    linkRepository.save(linkEntity.get());
                }
                break;
            case "NODE":
                Optional<NodeEntity> nodeEntity = nodeRepository.findById(id);
                if (nodeEntity.isPresent()) {
                    nodeEntity.get().setUSE_YN("N");
                    nodeRepository.save(nodeEntity.get());
                }
                break;
            case "FACILITY":
                Optional<FacilityEntity> facilityEntity = facilityRepository.findById(id);
                if (facilityEntity.isPresent()) {
                    facilityEntity.get().setUSE_YN("N");
                    facilityRepository.save(facilityEntity.get());
                }
        }

        return map;
    }

    public Map<String, Object> getSingleLink(String featureId) {
        Map<String, Object> map = new HashMap<>();
        map.put("FEATURE_ID", featureId);
        return networkDAO.getSingleLink(map);
    }

    public List<Map<String, Object>> getSmInter() {
        return networkDAO.getSmInter();
    }

    public void updateGeometry() {
        int updateRows = networkDAO.updateGeometry();
    }
}
