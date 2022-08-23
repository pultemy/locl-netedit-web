package com.web.netedit.api;

import com.web.netedit.entity.FacilityEntity;
import com.web.netedit.entity.LinkEntity;
import com.web.netedit.entity.NodeEntity;
import com.web.netedit.repository.FacilityRepository;
import com.web.netedit.repository.LinkRepository;
import com.web.netedit.util.NetworkUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionListener;
import java.util.*;

@RestController
@RequestMapping(value = "/api")
public class NetworkController implements HttpSessionListener {

    private final NetworkService networkService;

    private final FacilityRepository facilityRepository;

    @Autowired
    public NetworkController(NetworkService networkService, FacilityRepository facilityRepository) {
        this.networkService = networkService;
        this.facilityRepository = facilityRepository;
    }

    @RequestMapping(value = "/connectionTest")
    public List<Map<String, Object>> connectionTest() {
        return networkService.connectionTest();
    }

    @RequestMapping(value = "/link", method = RequestMethod.GET)
    public List<Map<String, Object>> getLink() {
        // get All Link
        return networkService.getLink();
    }

    @RequestMapping(value = "/linkByZone", method = RequestMethod.POST)
    public List<Map<String, Object>> getLinkByZone(@RequestBody Map paramMap) {
        String wkt = (String) paramMap.get("wkt");
        List<String> sggCode = (List<String>) paramMap.get("sggCode");
        return networkService.getLinkByZone(wkt, sggCode);
    }

    @RequestMapping(value = "/getRcline", method = RequestMethod.POST)
    public List<Map<String, Object>> getRcline(@RequestBody Map paramMap) {
        String wkt = (String) paramMap.get("wkt");
        List<String> sggCode = (List<String>) paramMap.get("sggCode");
        return networkService.getRcline(wkt, sggCode);
    }

    @RequestMapping(value = "/node", method = RequestMethod.POST)
    public List<Map<String, Object>> getNode(@RequestBody Map paramMap) {
        String fromNode = (String) paramMap.get("fromNode");
        String toNode = (String) paramMap.get("toNode");
        return networkService.getNode(fromNode, toNode);
    }

    @RequestMapping(value = "/turn", method = RequestMethod.GET)
    public List<Map<String, Object>> getTurn() {
        return networkService.getTurn();
    }

    @RequestMapping(value = "/saveData", method = RequestMethod.POST)
    public Map<String, Object> saveData(@RequestBody List<Map<String, Object>> paramMapList) {

        List<LinkEntity> linkEntityList = new ArrayList<>();
        List<NodeEntity> fromNodeEntityList = new ArrayList<>();
        List<NodeEntity> toNodeEntityList = new ArrayList<>();

        for (Map<String, Object> map : paramMapList) {

            Map<String, Object> linkDataRepo = (Map<String, Object>) map.get("LINK_DATA_REPO");
            LinkEntity linkEntity = networkService.controlLinkData(linkDataRepo);
            linkEntityList.add(linkEntity);

            Map<String, Object> fromNodeDataRepo = (Map<String, Object>) linkDataRepo.get("FROM_NODE_DATA_REPO");
            NodeEntity fromNodeEntity = networkService.controlNodeData(fromNodeDataRepo);
            fromNodeEntityList.add(fromNodeEntity);

            Map<String, Object> toNodeDataRepo = (Map<String, Object>) linkDataRepo.get("TO_NODE_DATA_REPO");
            NodeEntity toNodeEntity = networkService.controlNodeData(toNodeDataRepo);
            toNodeEntityList.add(toNodeEntity);

        }

        networkService.updateGeometry();

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("LINK_ENTITY_LIST", linkEntityList);
        resultMap.put("FROM_NODE_ENTITY_LIST", fromNodeEntityList);
        resultMap.put("TO_NODE_ENTITY_LIST", toNodeEntityList);
        return resultMap;
    }

    @RequestMapping(value = "/saveData/fac", method = RequestMethod.POST)
    public List<Map<String, Object>> saveFacData(@RequestBody List<Map<String, Object>> paramMapList) {

        for (Map<String, Object> map : paramMapList) {
            FacilityEntity newFacilityEntity = new FacilityEntity();

            String _facTy = (String) map.get("FAC_TY");
            String _wkt = (String) map.get("WKT");

            newFacilityEntity.setFAC_TY(_facTy);
            newFacilityEntity.setWKT(_wkt);
            newFacilityEntity.setUSE_YN(("Y"));

            Optional<FacilityEntity> originFacilityEntity = facilityRepository.findById((String) map.get("FAC_ID"));

            if (originFacilityEntity.isPresent()) {
                originFacilityEntity.get().setAll(newFacilityEntity);
                facilityRepository.save(originFacilityEntity.get());
            } else {
                newFacilityEntity.setFAC_ID((String) map.get("FAC_ID"));
                facilityRepository.save(newFacilityEntity);
            }

        }

        networkService.updateGeometry();

        return paramMapList;
    }

    @RequestMapping(value = "/getNodeGroup", method = RequestMethod.POST)
    public List<NodeEntity> nodeGroup(@RequestBody Map paramMap) {
        List<String> nodes = (List<String>) paramMap.get("nodes");
        List<NodeEntity> list = networkService.getNodeGroup(nodes);

        return list;
    }

    @RequestMapping(value = "/deleteData", method = RequestMethod.POST)
    public Map<String, Object> deleteData(@RequestBody Map map) {
        String id = (String) map.get("id");
        String dataType = (String) map.get("dataType");

        return networkService.deleteData(id, dataType);
    }

    // after 0512

    @RequestMapping(value = "/linkByZoneWithNodeData", method = RequestMethod.POST)
    public Map<String, Object> getLinkByZoneWithNodeData(@RequestBody Map paramMap, HttpServletRequest httpServletRequest) {
        String wkt = (String) paramMap.get("wkt");
        List<String> sggCode = (List<String>) paramMap.get("sggCode");

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("LINK_DATA", networkService.getLinkByZone(wkt, sggCode));
        resultMap.put("NODE_DATA", networkService.getNodeByLink(wkt, sggCode));
        resultMap.put("FACILITY_DATA", networkService.getFacilityByZone(wkt, sggCode));
        return resultMap;
    }

    @RequestMapping(value = "/singleLink", method = RequestMethod.POST)
    public Map<String, Object> getSingleLink(@RequestBody Map paramMap) {
        String featureId = (String) paramMap.get("featureId");
        return networkService.getSingleLink(featureId);
    }

    @RequestMapping(value = "/smInter", method = RequestMethod.GET)
    public List<Map<String, Object>> getSmInter() {
        return networkService.getSmInter();
    }

}
