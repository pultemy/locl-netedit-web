package com.web.netedit.util;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Iterator;
import java.util.Map;

public class NetworkUtil {

    public static Object convertMapToObject(Map map, Object objClass){
        String keyAttribute = null;
        String setMethodString = "set";
        String methodString = null;
        Iterator itr = map.keySet().iterator();

        while(itr.hasNext()){

            keyAttribute = (String) itr.next();
            methodString = setMethodString+keyAttribute.substring(0,1).toUpperCase()+keyAttribute.substring(1);

            try {
                if (!keyAttribute.equals("FROM_NODE_DATA_REPO") && !keyAttribute.equals("TO_NODE_DATA_REPO")) {
                    Method[] methods = objClass.getClass().getDeclaredMethods();
                    for(int i=0;i<=methods.length-1;i++){
                        if(methodString.equals(methods[i].getName())){
                            if (map.get(keyAttribute) != null) {
                                methods[i].invoke(objClass, map.get(keyAttribute));
                            }
                        }
                    }
                }
            } catch (SecurityException e) {
                e.printStackTrace();
                System.out.println("keyAttribute:" + keyAttribute + ", methodString:" + methodString);
            } catch (IllegalAccessException e) {
                e.printStackTrace();
                System.out.println("keyAttribute:" + keyAttribute + ", methodString:" + methodString);
            } catch (IllegalArgumentException e) {
                e.printStackTrace();
                System.out.println("keyAttribute:" + keyAttribute + ", methodString:" + methodString);
            } catch (InvocationTargetException e) {
                e.printStackTrace();
                System.out.println("keyAttribute:" + keyAttribute + ", methodString:" + methodString);
            }
        }
        return objClass;
    }

}
