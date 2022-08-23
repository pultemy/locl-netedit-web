import * as common from './common';
import axios from 'axios';
import Hotkeys from 'hotkeys-js';

import '../css/snap.css';
import '../css/style.css';
import 'ol-ext/dist/ol-ext.css'
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import 'tui-grid/dist/tui-grid.css'
import { Feature, Map } from 'ol';
import Collection from 'ol/Collection'
import { DragBox, Modify, Snap, Select } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer} from 'ol/layer';
import { Icon, Text, Fill, Circle as CircleStyle, Stroke, Style, RegularShape } from 'ol/style';
import Point from 'ol/geom/Point';
import MultiPoint from 'ol/geom/MultiPoint';
import { platformModifierKeyOnly } from 'ol/events/condition';
import * as olSphere from 'ol/sphere';

import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';
import {defaults as defaultControls} from 'ol/control';


import BlueArrowImg from '../data/resize_pink_arrow.png';
import NormalArrowImg from '../data/resize_yellow_arrow.png';
import Marker from '../data/marker.png';

import UndoRedo from 'ol-ext/interaction/UndoRedo'
import { fromExtent } from 'ol/geom/Polygon';
import WKT from 'ol/format/WKT';
import Grid from "tui-grid";
import Circle from "ol/geom/Circle";
import {LineString} from "ol/geom";
import LayerSwitcher from "ol-layerswitcher";


// global value
let LINK_DATA = null;
let NODE_DATA = null;

let CIRCLE_RADIUS = 0.0000005;

let map = null;

let SHOW_EDIT_TY = 'ALL';

let GRID_SET_LINK_ID = null;

const markerSource = new VectorSource({});
const markerLayer = new VectorLayer({
  source: markerSource
});

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(6),
  projection: 'EPSG:4326',
  // comment the following two lines to have the mouse position
  // be placed within the map.
  className: 'custom-mouse-position',
  target: document.getElementById('mouse-position'),
});


const source = new VectorSource({
  features: new Collection(),
  wrapX: false
});
const layer = new VectorLayer({
  source: source
});

const smSource = new VectorSource({
  features: new Collection(),
  wrapX: false
});
const smLayer = new VectorLayer({
  source: smSource,
    style: new Style({
        image: new CircleStyle({
              radius: 13,
              fill: new Fill({color: 'rgba(255, 0, 0, 0.6)'})
          }),
        zIndex: 999,
      })
});

let displayZoneFeature = null;

let saveDataArchive = [];

const iconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 0.96],
    scale: 0.1,
    src: Marker
  }),
});


const styleFunction = function (feature) {
  const props = feature.getProperties();
  const geometry = feature.getGeometry();

  const selectedFeaturesId = getSelectedFeaturesId();

  const inputText = document.getElementById('search-feature').value;
  const gridSetData = GRID_SET_LINK_ID;

  let styles = [
    // linestring
    new Style({
      stroke: new Stroke({
          color: props.EDIT_YN ? '#62ff00' : (gridSetData === feature.getId() ? '#C70039'
                          : (inputText === feature.getId() ? '#C70039'
                              : (selectedFeaturesId.includes(feature.getId()) ? '#FFB2F5' : '#FFE400')
                            )
                  ),
          width: props.EDIT_YN ? 8 : (selectedFeaturesId.includes(feature.getId()) ? 5 : 4),
      }),
      text: new Text({
        font: '8px Verdana',
        text: selectedFeaturesId.includes(feature.getId()) ? feature.getId() : '',
        fill: new Fill({ color: 'red' }),
        stroke: new Stroke({ color: 'yellow', width: 3 })
      }),
      zIndex: 999
    }),
  ];

  if (getZoomLevel() > 16) {
    let from = geometry.getFirstCoordinate();
    let to = geometry.getLastCoordinate();
    const all_dx = to[0] - from[0];
    const all_dy = to[1] - from[1];
    const all_rotation = Math.atan2(all_dy, all_dx);
    // arrows
    styles.push(
      new Style({
        geometry: new Point(to),
        image: new Icon({
          src: selectedFeaturesId.includes(feature.getId())  ? BlueArrowImg : NormalArrowImg,
          // color: selectedFeaturesId.includes(feature.getId()) ? '#FFB2F5' : '#FFE400',
          anchor: [0.75, 0.5],
          opacity: getZoomLevel() > 16 ? 1 : 0,
          scale: [1.5, 1.5],
          rotateWithView: true,
          rotation: -all_rotation,
        }),
        zIndex: 999,
      })
    );

    let segCount = 0;

    geometry.forEachSegment(function (start, end) {
      segCount++;
      if(segCount % 3 === 0) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const rotation = Math.atan2(dy, dx);

          // arrows
          styles.push(
            new Style({
              geometry: new Point(end),
              image: new Icon({
                src: selectedFeaturesId.includes(feature.getId())  ? BlueArrowImg : NormalArrowImg,
                // color: selectedFeaturesId.includes(feature.getId()) ? '#0000ff' : '#ffcc33',
                opacity: getZoomLevel() > 16 ? 1 : 0,
                anchor: [0.75, 0.5],
                rotateWithView: true,
                rotation: -rotation,
              }),
              zIndex: 999
            })
          );
      }
    });

    let fromRegularShapeStyle = new Style({
      image: new RegularShape({
        radius: 6,
        points:6,
        fill: new Fill({
          color: '#0100FF'
        })
      }),
      zIndex: 999,
      geometry: new Point(from)
    })

    let toRegularShapeStyle = new Style({
      image: new RegularShape({
        radius: 6,
        points:6,
        fill: new Fill({
          color: '#0100FF'
        })
      }),
      zIndex: 999,
      geometry: new Point(to)
    })

    styles.push(fromRegularShapeStyle);
    styles.push(toRegularShapeStyle);
  }

  return styles;
};

const rcLineStyleFunction = function (feature) {
  const props = feature.getProperties();
  const geometry = feature.getGeometry();
  const styles = [
    // linestring
    new Style({
      stroke: new Stroke({
        color: 'rgba(95, 0, 255, 0.8)',
        width: 4,
      }),
      zIndex: 100
    }),
  ];

  let from = geometry.getFirstCoordinate();
  let tt = geometry.getLastCoordinate();

  let segCount = 0;

    let fromToRegularShapeStyle = new Style({
        image: new RegularShape({
          radius: 5,
          points:5,
          fill: new Fill({
            color: 'rgba(0, 183, 0, 0.7)'
          })
        }),
        zIndex: 100,
        geometry: new MultiPoint([from, tt])
      })
      styles.push(fromToRegularShapeStyle);

  if (getZoomLevel() > 20) {

    geometry.forEachSegment(function (start, end) {
      let regularShapeStyle = new Style({
        image: new RegularShape({
          radius: 5,
          points:5,
          fill: new Fill({
            color: 'rgba(0, 183, 0, 0.7)'
          })
        }),
        zIndex: 100,
        geometry: new MultiPoint(start, end)
      })
      styles.push(regularShapeStyle);
    });

  } else if (getZoomLevel() > 18) {

    geometry.forEachSegment(function (start, end) {

      segCount++;
      if(segCount % 3 === 0) {
        let regularShapeStyle = new Style({
          image: new RegularShape({
            radius: 5,
            points:5,
            fill: new Fill({
              color: 'rgba(0, 183, 0, 0.7)'
            })
          }),
          zIndex: 100,
          geometry: new MultiPoint(start, end)
        })
        styles.push(regularShapeStyle);
      }

    });

  } else {

  }

  return styles;
};

let SHOW_USE_YN = 'Y';

let targetFeature = null;

// interactionValue
let select, snap, modify, undoInteraction;
//

// grid value

let LINK_GRID_INSTANCE;
let FROM_NODE_GRID_INSTANCE;
let TO_NODE_GRID_INSTANCE;

const DEFAULT_COLUMN = [
  {
    header: '컬럼명',
    name: 'name',
    align: 'center',
    valign: 'middle'
  },
  {
    header: 'Value',
    name: 'value',
    align: 'center',
    valign: 'middle',
  }
];

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initGrid();

    getSmInter();

    addSelectInteraction();
    addModifyInteraction();
    addSnapInteraction();
    addUndoInteraction();
    addDrawBoxInteraction();

    domEventRegister();
})

function domEventRegister() {
    document.getElementById('UNDO_BTN').addEventListener('click', (e) => {
        undoInteraction.undo();
        wktUpdate();
    })

    document.getElementById('REDO_BTN').addEventListener('click', (e) => {
        undoInteraction.redo();
        wktUpdate();
    })

    document.getElementById('SAVE_BTN').addEventListener('click', (e) => {
        applyData();
    })

    document.getElementById('search-feature-btn').addEventListener('click', (e) => {
        const inputText = document.getElementById('search-feature').value;
        getSingleLink(inputText);
    })

    // Use Array.forEach to add an event listener to each checkbox.
    document.querySelectorAll("input[type=checkbox][name=sgg]").forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
          clearing();
      })
    });

    Hotkeys('a', function(event, handler) {
        const [XCRD, YCRD] = (document.getElementById('mouse-position').innerText).split(", ");

        markerSource.clear();
        let feature = new Feature({
                    geometry: new Point([Number(XCRD), Number(YCRD)])
                })
        feature.setStyle(iconStyle);
        markerSource.addFeature(feature);

        const copyText = YCRD + "," + XCRD;

        copyToClipboard(copyText);

        toastr.options.timeOut = 100;
        toastr.options.positionClass = 'toast-bottom-right';
        toastr.success('Coppied!')

    })

    Hotkeys('ctrl+l', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        SHOW_EDIT_TY = 'ALL'
        console.log(SHOW_EDIT_TY);
        map.dispatchEvent('moveend');
    })

    Hotkeys('ctrl+k', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        SHOW_EDIT_TY = null;
        console.log(SHOW_EDIT_TY);
        map.dispatchEvent('moveend');
    })

    Hotkeys('ctrl+s', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        applyData();
    })

    Hotkeys('ctrl+a', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        const selectedFeatures = select.getFeatures();
        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                target.set("EDIT_TY", "1");
                const LINK_DATA_REPO = target.get("LINK_DATA_REPO");
                LINK_DATA_REPO.EDIT_TY = "1";
                target.set("LINK_DATA_REPO", LINK_DATA_REPO);
            }
        });
    })
}

function initMap() {
    map = new Map({
        target: 'map',
        layers: [
          common._baseMapLayer,
          common._baseMapInfoLayer,
          smLayer,
          layer,
          markerLayer
        ],
        view: common._mainMapView,
        loadTilesWhileAnimating: true,
        controls: defaultControls().extend([mousePositionControl])
    });

    let layerSwitcher = new LayerSwitcher({
        groupSelectStyle: 'children' // Can be 'children' [default], 'group' or 'none'
    });
    map.addControl(layerSwitcher);

    let nowDisplayExtent = getExtent();

    let displayZonePolygon = fromExtent(nowDisplayExtent);

    displayZoneFeature = new Feature({
        geometry: displayZonePolygon
    })

    map.on('click', function(evt) {
        evt.preventDefault();
        const pixel = map.getEventPixel(evt)
        const coords = map.getEventCoordinate(evt);
        let test = null;

        map.forEachFeatureAtPixel(pixel, function(_f) {
            if (_f.get("featureType") === "LINK") {
                test = _f;
            }
        })

        if (!test) {
            LINK_GRID_INSTANCE.resetData([]);
            FROM_NODE_GRID_INSTANCE.resetData([]);
            TO_NODE_GRID_INSTANCE.resetData([]);
            GRID_SET_LINK_ID = null;
            source.dispatchEvent('change');
        }

    })

    map.on('pointermove', function(e) {
        map.getTargetElement().style.cursor = map.hasFeatureAtPixel(e.pixel) ? 'pointer' : '';
    })

    map.on('moveend', function(e) {
        // zoom 할 수록 커짐
        let newZoom = getZoomLevel();

        if (newZoom > 16) {
            let nowDisplayExtent = getExtent();

            let displayZonePolygon = fromExtent(nowDisplayExtent);

            displayZoneFeature = new Feature({
                geometry: displayZonePolygon
            })

            let format = new WKT(),
                wkt = format.writeGeometry(displayZoneFeature.getGeometry());

            if (getCheckValue().length === 0) {
                getFeaturesByZone(wkt);
            }
            getRcLineByZone(wkt);
        }
    })

    map.getViewport().addEventListener('contextmenu', function (evt) {
        evt.preventDefault();
        const pixel = map.getEventPixel(evt)
        const coords = map.getEventCoordinate(evt);
        let target = null;

        const selectedFeatures = select.getFeatures();
        const idMaps = selectedFeatures.getArray().map(v => v.getId());

        map.forEachFeatureAtPixel(pixel, function(_f) {
            if (_f.get("featureType") === "LINK") {
                target = _f;
            }
        })

        if (!target) {

            const COORDS_CIRCLE = new Circle(coords, CIRCLE_RADIUS)
            // source.addFeature(new Feature(COORDS_CIRCLE));

            const intersect = source.getFeaturesInExtent(COORDS_CIRCLE.getExtent());
            // source.addFeature(new Feature(fromExtent(COORDS_CIRCLE.getExtent())));

            let dist = 999999999999999;

            intersect.forEach(function(v) {
                if (v.get("featureType") === "LINK") {
                    // target = v;

                    v.getGeometry().forEachSegment(function(start, end) {
                        let compareDist = olSphere.getDistance(coords, start)
                        if (compareDist < dist) {
                            target = v;
                            dist = compareDist;
                        }
                        compareDist = olSphere.getDistance(coords, end);
                        if (compareDist < dist) {
                            target = v;
                            dist = compareDist;
                        }

                        const segLine = new LineString([start, end]);
                        const segLineCenterCoord = segLine.getCoordinateAt(0.5);
                        compareDist = olSphere.getDistance(coords, segLineCenterCoord)
                        if (compareDist < dist) {
                            target = v;
                            dist = compareDist;
                        }
                    })

                }
            })

        }


        if (target) {
            setNodeData(target);
            pushSaveData(target);
            setGridData(target);
            console.log(target.getProperties());
        }

        source.dispatchEvent('change');

    })
}

function initGrid() {

  LINK_GRID_INSTANCE = new Grid({
    el: document.getElementById('link-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 380,
    bodyHeight: 380,
    columns: DEFAULT_COLUMN
  });

  FROM_NODE_GRID_INSTANCE = new Grid({
    el: document.getElementById('from-node-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    width: 280,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 200,
    bodyHeight: 200,
    columns: DEFAULT_COLUMN
  });

  TO_NODE_GRID_INSTANCE = new Grid({
    el: document.getElementById('to-node-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    width: 280,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 200,
    bodyHeight: 200,
    columns: DEFAULT_COLUMN
  });

  // LINK_GRID_INSTANCE.resetData(newData); // Call API of instance's public method

  Grid.applyTheme('striped'); // Call API of static method

  setGridEditable();

}

// interactions

function addSelectInteraction() {
    select = new Select({
        source: source,
        filter: function(f, l) {

          if (f.get('featureType') === "LINK") {
            return true;
          } else {
            return false;
          }

        },
        style: styleFunction,
        multi: false
    })

    let selectedFeatures = select.getFeatures();

    selectedFeatures.on('add', function(e) {
        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                setNodeData(target);
                pushSaveData(target);
            }
        });
    })

    map.addInteraction(select);
}

function addModifyInteraction() {
    modify = new Modify({
        features: select.getFeatures(),
        pixelTolerance: 15,
        wrapX: false
    });

    modify.on('modifyend', function(e) {

        wktUpdate();


    })

    map.addInteraction(modify);
}

function addSnapInteraction() {
    snap = new Snap({
        source: source
    });
    map.addInteraction(snap);
}

function addUndoInteraction() {
    // Undo redo interaction
    undoInteraction = new UndoRedo();
    map.addInteraction(undoInteraction);
}

function addDrawBoxInteraction() {
    // a DragBox interaction used to select features by drawing boxes
    const dragBox = new DragBox({
      condition: platformModifierKeyOnly,
    });

    let selectedFeatures = select.getFeatures();

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
      selectedFeatures.clear();
    });

    dragBox.on('boxend', function () {
      const extent = dragBox.getGeometry().getExtent();
      const boxFeatures = source.getFeaturesInExtent(extent).filter((feature) => feature.getGeometry().intersectsExtent(extent)).filter(v => v.get("featureType") === "LINK");
      selectedFeatures.extend(boxFeatures);
    });

    map.addInteraction(dragBox);
}
//

function getSmInter() {
    axios.get(`${common.API_PATH}/api/smInter`)
      .then(({ data }) => {

        for (let i=0; i<data.length; i++) {
            const d = data[i];
            const format = new WKT();
            let _feature = format.readFeature(d.wkt,  {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:4326'
            });
            smSource.addFeature(_feature);
        }


      })
      .catch((e) => {
          console.log(e)
      })
}

function getSingleLink(_featureId) {
    axios.post(`${common.API_PATH}/api/singleLink`, {
        featureId: _featureId
    })
    .then(({ data }) => {

        if (data) {
            const format = new WKT();
            let _feature = format.readFeature(data.wkt,  {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:4326'
            });

            const centerCoords = _feature.getGeometry().getCoordinateAt(0.5);

            map.getView().setZoom(17);
            map.getView().setCenter(centerCoords);
        } else {
            alert('데이터가 없습니다.');
        }


    })
    .catch((e) => {
        alert('데이터가 없거나 오류가 발생했습니다.');
    })
}

function getFeaturesByZone(_displayZoneWKT) {
  axios.post(`${common.API_PATH}/api/linkByZoneWithNodeData`, {
    wkt: _displayZoneWKT,
    sggCode: getCheckValue()
  })
  .then(({ data }) => {

    LINK_DATA = data.LINK_DATA;
    NODE_DATA = data.NODE_DATA;

    makeLinkFeatures(LINK_DATA);

  })
  .catch(function (error) {
    console.log(error);
  });

}

function getRcLineByZone(_displayZoneWKT) {
  axios.post(`${common.API_PATH}/api/getRcline`, {
    wkt: _displayZoneWKT,
    sggCode: getCheckValue()
  })
  .then(({ data }) => {

    source.forEachFeature((f) => {
        if (f.get("featureType") === "RCLINE") {
            source.removeFeature(f);
      }
    })

    makeRcLineFeatures(data);

  })
  .catch(function (error) {
    console.log(error);
  });
}

function makeLinkFeatures(_data) {

  const dataLength = _data.length;
  const format = new WKT();

  for (let i=0; i<dataLength; i++) {
    const d = _data[i];
    if (d.use_yn !== SHOW_USE_YN) {
        let removeTarget = source.getFeatureById(d.link_id);
        if (removeTarget) {
            source.removeFeature(removeTarget)
        }
        continue;
    };
    if (SHOW_EDIT_TY !== 'ALL' && d.edit_ty !== "1") {
        let removeTarget = source.getFeatureById(d.link_id);
        if (removeTarget) {
            source.removeFeature(removeTarget)
        }
        continue;
    }

    let _feature = format.readFeature(d.wkt,  {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:4326'
    });
    _feature.setId(d.link_id);
    _feature.setProperties({
      'featureType': 'LINK',
      'LINK_ID': d.link_id,
      'UP_FROM_NODE': d.up_from_node,
      'UP_TO_NODE': d.up_to_node,
      'UP_LANES': d.up_lanes || '',
      'ROAD_NAME': d.road_name || '',
      'DOWN_FROM_NODE': d.down_from_node || '',
      'DOWN_TO_NODE': d.down_to_node || '',
      'DOWN_LANES': d.down_lanes || '',
      'EDIT_TY': d.edit_ty || '',
      'FIRST_DO': d.first_do || '',
      'FIRST_GU': d.first_gu || '',
      'LEFT_TURN_UP_DOWN': d.left_turn_up_down || '',
      'LANE_CHANGE': d.lane_change || '',
      'EX_POCKET_NUM': d.ex_pocket_num || '',
      'EDIT_YN': d.edit_yn || '',
      'USER_1': d.user_1 || '',
      'USER_2': d.user_2 || '',
      'USER_3': d.user_3 || '',
      'USER_4': d.user_4 || '',
      'WKT': d.wkt
    })
    source.addFeature(_feature);
    _feature.setStyle(styleFunction)
  }

}

function makeRcLineFeatures(_data) {

  const dataLength = _data.length;
  const format = new WKT();

  for (let i=0; i<dataLength; i++) {
    const d = _data[i];
    let _feature = format.readFeature(d.wkt,  {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:4326'
    });
    _feature.setId(d.ufid);
    _feature.setProperties({
      'featureType': 'RCLINE',
      'WKT': d.wkt
    })
    source.addFeature(_feature);
    _feature.setStyle(rcLineStyleFunction);
  }

}

function setGridEditable() {
  const EDITABLE_COLUMN = [
    {
      header: '컬럼명',
      name: 'name',
      align: 'center',
      valign: 'middle'
    },
    {
      header: 'Value',
      name: 'value',
      align: 'center',
      valign: 'middle',
      editor: 'text'
    }
  ];

  LINK_GRID_INSTANCE.on('afterChange', (ev) => {
      const changes = ev.changes[0];
      const rowInfo = LINK_GRID_INSTANCE.getRowAt(changes.rowKey);
      const changeColumnName = rowInfo.name;
      const changeValue = rowInfo.value;
      const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
      const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
      const feature = source.getFeatureById(LINK_ID);
      const featureRepo = feature.get("LINK_DATA_REPO");

      console.log(feature.getProperties());
      console.log(featureRepo);

      console.log(changeColumnName);

      featureRepo[changeColumnName] = changeValue;
      feature.set(changeColumnName, changeValue);
      feature.set("LINK_DATA_REPO", featureRepo);
  })

  FROM_NODE_GRID_INSTANCE.on('afterChange', (ev) => {
    const changes = ev.changes[0];
    const rowInfo = FROM_NODE_GRID_INSTANCE.getRowAt(changes.rowKey);
    const changeColumnName = rowInfo.name;
    const changeValue = rowInfo.value;

    const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
    const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
    const feature = source.getFeatureById(LINK_ID);
    const featureRepo = feature.get("LINK_DATA_REPO");
    const fromNodeRepo = featureRepo.FROM_NODE_DATA_REPO;
    fromNodeRepo[changeColumnName] = changeValue;
    feature.set("FROM_NODE_DATA_REPO", fromNodeRepo);
  })

  TO_NODE_GRID_INSTANCE.on('afterChange', (ev) => {
    const changes = ev.changes[0];
    const rowInfo = TO_NODE_GRID_INSTANCE.getRowAt(changes.rowKey);
    const changeColumnName = rowInfo.name;
    const changeValue = rowInfo.value;

    const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
    const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
    const feature = source.getFeatureById(LINK_ID);
    const featureRepo = feature.get("LINK_DATA_REPO");
    const fromNodeRepo = featureRepo.TO_NODE_DATA_REPO;
    fromNodeRepo[changeColumnName] = changeValue;
    feature.set("TO_NODE_DATA_REPO", fromNodeRepo);
  })

  LINK_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
  FROM_NODE_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
  TO_NODE_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
}

function setNodeData(target) {
    const FROM_NODE = target.get("UP_FROM_NODE");
    const TO_NODE = target.get("UP_TO_NODE");

    const {geometry, featureType, ...LINK_PROPS} = JSON.parse(JSON.stringify(target.getProperties()));

    const FROM_NODE_PROPS = NODE_DATA.find(v => {
        return v.node_id === FROM_NODE;
    })
    const TO_NODE_PROPS = NODE_DATA.find(v => {
        return v.node_id === TO_NODE;
    })

    const LINK_DATA_REPO = LINK_PROPS.LINK_DATA_REPO;
    if (LINK_DATA_REPO) {
        return;
    }

    if (FROM_NODE_PROPS) {
        const FROM_NODE_PROPS_FORM = {
              NODE_ID: FROM_NODE_PROPS.node_id,
              NODE_TYPE: FROM_NODE_PROPS.node_type,
              NODE_NAME: FROM_NODE_PROPS.node_name,
              TRAFFIC_LIGHT: FROM_NODE_PROPS.traffic_light,
              DISTRICT_ID: FROM_NODE_PROPS.district_id,
              DISTRICT_ID2: FROM_NODE_PROPS.district_id2,
              EDIT_YN: FROM_NODE_PROPS.edit_yn
        }
        LINK_PROPS.FROM_NODE_DATA_REPO = FROM_NODE_PROPS_FORM;
    }

    if (TO_NODE_PROPS) {
        const TO_NODE_PROPS_FORM = {
              NODE_ID: TO_NODE_PROPS.node_id,
              NODE_TYPE: TO_NODE_PROPS.node_type,
              NODE_NAME: TO_NODE_PROPS.node_name,
              TRAFFIC_LIGHT: TO_NODE_PROPS.traffic_light,
              DISTRICT_ID: TO_NODE_PROPS.district_id,
              DISTRICT_ID2: TO_NODE_PROPS.district_id2,
              EDIT_YN: TO_NODE_PROPS.edit_yn
        }
        LINK_PROPS.TO_NODE_DATA_REPO = TO_NODE_PROPS_FORM;
    }

    target.set("LINK_DATA_REPO", LINK_PROPS);
}

function pushSaveData(target) {
    // const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, geometry, featureType, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.getProperties()));
    saveDataArchive.push(target.getId());
    saveDataArchive = Array.from(new Set(saveDataArchive));
}

function setGridData(target) {
    const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.get("LINK_DATA_REPO")));

    const LINK_GRID_DATA = getGridData(LINK_DATA_REPO, 'LINK')
    LINK_GRID_INSTANCE.resetData(LINK_GRID_DATA);

    const FROM_NODE_GRID_DATA = getGridData(FROM_NODE_DATA_REPO, 'FROM_NODE');
    FROM_NODE_GRID_INSTANCE.resetData(FROM_NODE_GRID_DATA);
    const TO_NODE_GRID_DATA = getGridData(TO_NODE_DATA_REPO, 'TO_NODE');
    TO_NODE_GRID_INSTANCE.resetData(TO_NODE_GRID_DATA);

    GRID_SET_LINK_ID = target.get("LINK_ID");
}

function getGridData(_data, _dataType) {
  // { name: 컬럼명, value: 값 }

  const columnNames = [];

  for (let key in _data) {
    columnNames.push(key.toUpperCase());
  }

  const dataMap = columnNames.filter(v => v !== 'USE_YN' && v !== 'GEOMETRY' && v !== 'FEATURETYPE' && v !== 'WKT' && v != 'FROM_NODE_DATA_REPO' && v != 'TO_NODE_DATA_REPO').map(v => {
    return {
      name: v,
      value: _data[v]
    }
  })

    return dataMap;
}

function applyData() {

    wktUpdate();

    const urlPrefix = `${common.API_PATH}/api`;

    const DATA_REPO = saveDataArchive.map(v => {
        const findFeature = source.getFeatureById(v);
        const findFeaturesProps = findFeature.getProperties();
        return findFeaturesProps;
    })

    console.log(DATA_REPO);

    // axios.post(`${urlPrefix}/saveData/${_dataType}`, sendData)
    axios.post(`${urlPrefix}/saveData`, DATA_REPO)
    .then(({ data }) => {

        if (data) {
            clearing();
            alert('저장되었습니다.');
            saveDataArchive = [];
        }

    })
    .catch(function (error) {
        console.log(error);
    });


}

//////////////////////////////

function getExtent() {
  return map.getView().calculateExtent();
}

function getSelectedFeaturesId() {
    return select ? select.getFeatures().getArray().map(v => v.getId()) : [];
}

function getZoomLevel() {
    return Math.round(map.getView().getZoom());
}

function makeTimeKey() {
  let today = new Date();
  let yyyy = String(today.getFullYear());
  let mm = today.getMonth() < 10 ? "0" + String(today.getMonth() + 1) : String(today.getMonth());
  let dd = today.getDate() < 10 ? "0" + String(today.getDate()) : String(today.getDate());
  let hh = today.getHours() < 10 ? "0" + String(today.getHours()) : String(today.getHours());
  let mi = today.getMinutes() < 10 ? "0" + String(today.getMinutes()) : String(today.getMinutes());
  let ss = today.getSeconds() < 10 ? "0" + String(today.getSeconds()) : String(today.getSeconds());

  return yyyy + mm + dd + hh + mi + ss;
}

function clearing() {
    LINK_GRID_INSTANCE.resetData([]);
    FROM_NODE_GRID_INSTANCE.resetData([]);
    TO_NODE_GRID_INSTANCE.resetData([]);

    let format = new WKT();
    let wkt;
    if (displayZoneFeature) {
        wkt = format.writeGeometry(displayZoneFeature.getGeometry());
    }

    source.clear();

    displayZoneFeature = null;

    if (getZoomLevel() > 16) {
        let nowDisplayExtent = getExtent();
        let displayZonePolygon = fromExtent(nowDisplayExtent);
        displayZoneFeature = new Feature({
            geometry: displayZonePolygon
        })
        getRcLineByZone(wkt);

        if (getCheckValue().length === 0) {
            getFeaturesByZone(wkt);
        } else {
            getFeaturesByZone('');
        }
    }

    getFeaturesByZone(wkt);


    select.getFeatures().clear();
    GRID_SET_LINK_ID = null;
}

function getCheckValue() {
    const chkList = document.querySelectorAll("input[name=sgg]:checked");
    const checkedValueArray = [];
    chkList.forEach(function (ch) {
        checkedValueArray.push(ch.value);
    });

    return checkedValueArray;
}

function wktUpdate() {
    const selectedFeatures = select.getFeatures();

    selectedFeatures.forEach(function(_f) {
        if (_f.get("featureType") === "LINK") {
            const wkt = new WKT();
            const NEW_LINK_WKT = wkt.writeGeometry(_f.getGeometry()).replace("(", " (").replace(",",", ");
            const NEW_FROM_NODE_WKT = wkt.writeGeometry(new Point(_f.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ");
            const NEW_TO_NODE_WKT = wkt.writeGeometry(new Point(_f.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ");

            _f.set("WKT", NEW_LINK_WKT);

            const LINK_DATA_REPO = JSON.parse(JSON.stringify(_f.get("LINK_DATA_REPO")));
            const FROM_NODE_DATA_REPO = JSON.parse(JSON.stringify(LINK_DATA_REPO.FROM_NODE_DATA_REPO));
            const TO_NODE_DATA_REPO = JSON.parse(JSON.stringify(LINK_DATA_REPO.TO_NODE_DATA_REPO));

            LINK_DATA_REPO.WKT = NEW_LINK_WKT;
            FROM_NODE_DATA_REPO.WKT = NEW_FROM_NODE_WKT;
            TO_NODE_DATA_REPO.WKT = NEW_TO_NODE_WKT;

            LINK_DATA_REPO.FROM_NODE_DATA_REPO = FROM_NODE_DATA_REPO;
            LINK_DATA_REPO.TO_NODE_DATA_REPO = TO_NODE_DATA_REPO;

            _f.set("LINK_DATA_REPO", LINK_DATA_REPO);

            console.log('--WKT update')
            console.log(LINK_DATA_REPO);
            console.log(FROM_NODE_DATA_REPO);
            console.log(TO_NODE_DATA_REPO);

            _f.set("FROM_NODE_DATA_REPO", FROM_NODE_DATA_REPO);
            _f.set("TO_NODE_DATA_REPO", TO_NODE_DATA_REPO);
        }
    })
}

function copyToClipboard(val) {
  const t = document.createElement("textarea");
  document.body.appendChild(t);
  t.value = val;
  t.select();
  document.execCommand('copy');
  document.body.removeChild(t);
}
