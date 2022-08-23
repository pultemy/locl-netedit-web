package com.web.netedit.api;

import com.web.netedit.entity.SessionEntity;
import com.web.netedit.repository.SessionRepository;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.StoredProcedureQuery;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;
import java.sql.Timestamp;
import java.util.*;

@RestController
public class WebSessionListener implements HttpSessionListener {

    private static HashMap<String, Object> ACTIVE_SESSION_LIST = new HashMap();
    private static char[] SESSION_SUFFIX_ARRAY = new char[150];

    private final SessionRepository sessionRepository;

    public WebSessionListener(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;

        int minLimitNum = 65;
        int maxLimitNum = 122;

        for (int i=0; i<SESSION_SUFFIX_ARRAY.length; i++) {

            if (i < minLimitNum || i > maxLimitNum || (91 <= i && i <= 96)) {
                SESSION_SUFFIX_ARRAY[i] = '-';
            } else {
                SESSION_SUFFIX_ARRAY[i] = (char) i;
            }

        }

        SESSION_SUFFIX_ARRAY = new String(SESSION_SUFFIX_ARRAY).replaceAll("-","").toCharArray();
        allSessionCheck();
    }

    @RequestMapping(value = "/setSession", method = RequestMethod.POST)
    public Map<String, Object> setSession(HttpServletRequest hsr) {
        allSessionCheck();
        HttpSession session = hsr.getSession();
        String _uuid = UUID.randomUUID().toString();
        session.setAttribute("uuid", _uuid);

        synchronized(ACTIVE_SESSION_LIST){
            ACTIVE_SESSION_LIST.put(_uuid, session); // key, value
        }

        Timestamp timestamp = new Timestamp(System.currentTimeMillis());

        SessionEntity sessionEntity = new SessionEntity();
        sessionEntity.setUuid(_uuid);
        sessionEntity.setSessionId(session.getId());
        sessionEntity.setLastActiveTm(timestamp);
        sessionEntity.setActiveYn("Y");

        List<String> list = sessionRepository.findDistinctSessionSuffix();
        System.out.println(list);

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("UUID", _uuid);

        System.out.println(list.contains(SESSION_SUFFIX_ARRAY[0]));
        System.out.println(list.contains("A"));
        System.out.println(list.contains('A'));

        for (int i=0; i<SESSION_SUFFIX_ARRAY.length; i++) {
            boolean isContains = list.contains(String.valueOf(SESSION_SUFFIX_ARRAY[i]));

            if (isContains) {
                continue;
            } else {
                sessionEntity.setSessionSuffix(String.valueOf(SESSION_SUFFIX_ARRAY[i]));
                resultMap.put("SESSION_SUFFIX", String.valueOf(SESSION_SUFFIX_ARRAY[i]));
                break;
            }
        }

        sessionRepository.save(sessionEntity);

        currentSessionList();

        return resultMap;
    }

    @RequestMapping(value = "/expireSession", method = RequestMethod.POST)
    public void expireSession(@RequestBody Map paramMap) {
        allSessionCheck();
        String _uuid = (String) paramMap.get("sessionUid");

        HttpSession session = null;
        synchronized(ACTIVE_SESSION_LIST){
            session = (HttpSession) ACTIVE_SESSION_LIST.get(_uuid);
        }

        if (session != null) {
            session.removeAttribute("uuid");
            session.invalidate();

            synchronized(ACTIVE_SESSION_LIST){
                System.out.println("expire");
                ACTIVE_SESSION_LIST.remove(_uuid);
            }

            Optional<SessionEntity> sessionEntity = sessionRepository.findById(_uuid);
            if (sessionEntity.isPresent()) {
                sessionRepository.delete(sessionEntity.get());
            }

            currentSessionList();
        }

    }

    @RequestMapping(value = "/sessionCheck", method = RequestMethod.POST)
    public String sessionCheck(@RequestBody Map paramMap) {
        allSessionCheck();

        Optional<SessionEntity> sessionEntity = sessionRepository.findById((String) paramMap.get("sessionUid"));

        if (sessionEntity.isPresent()) {
            System.out.println("SESSION FIND SUCCESS");

            Timestamp now = new Timestamp(System.currentTimeMillis());

            Timestamp entitiesLastTm = sessionEntity.get().getLastActiveTm();

            long diff = now.getTime() - entitiesLastTm.getTime();

            if (diff / (1000 * 60) >= 20) { // 20분 이상
                sessionRepository.delete(sessionEntity.get());
                return "EXPIRED";
            } else {
                sessionEntity.get().setLastActiveTm(now);
                sessionRepository.save(sessionEntity.get());
                return "ACTIVE";
            }
        } else {
            System.out.println("SESSION FIND FAIL");
            return "EXPIRED";
        }

    }

    public void allSessionCheck() {
        Timestamp now = new Timestamp(System.currentTimeMillis());

        List<SessionEntity> sessionEntityList = sessionRepository.findAll();

        for (SessionEntity se : sessionEntityList) {

            Timestamp entitiesLastTm = se.getLastActiveTm();

            long diff = now.getTime() - entitiesLastTm.getTime();

            if (diff / (1000 * 60) >= 20) { // 10분 이상
                sessionRepository.delete(se);
            }
        }
    }

    private void currentSessionList(){
        HttpSession session = null;

        System.out.println("Current Session List");
        System.out.println("------------------------------");
        /* 향상된for문을 사용하여 HashTable의 값을 출력 */
        for(Map.Entry<String, Object> e : ACTIVE_SESSION_LIST.entrySet()) {
            System.out.println("Key : " + e.getKey() + ", Value : " + ((HttpSession) e.getValue()).getId());
        }
        System.out.println("------------------------------");
    }

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        //
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        //
    }

}
