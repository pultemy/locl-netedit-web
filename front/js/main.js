import * as common from './common';
import axios from 'axios';

import '../css/style.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import 'tui-grid/dist/tui-grid.css'

import '../css/main.css';
import { Feature, Map } from 'ol';
import Collection from 'ol/Collection'
import { Draw, Modify, Snap, Select } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer} from 'ol/layer';
import { Icon, Circle as CircleStyle, Fill, Stroke, Style, RegularShape } from 'ol/style';
import Point from 'ol/geom/Point';
import MultiPoint from 'ol/geom/MultiPoint';
import { platformModifierKeyOnly } from 'ol/events/condition';
// import { Point, MultiPoint, LineString, Polygon } from 'ol/geom';

import BlueArrowImg from '../data/resize_blue_arrow.png';
import NormalArrowImg from '../data/resize_normal_arrow.png';

import LayerSwitcher from 'ol-layerswitcher';
import 'ol-ext/dist/ol-ext.css'
import UndoRedo from 'ol-ext/interaction/UndoRedo'
import Split from 'ol-ext/interaction/Split'
import { fromExtent } from 'ol/geom/Polygon';
import WKT from 'ol/format/WKT';

import Grid from 'tui-grid';
import Hotkeys from 'hotkeys-js';

// ---------- global value define start ---------
let map = null;

let selectedMode, selectedType;
let targetFeature;
let redoGeometryInfo;
let featureType;
let displayZoneFeature;

let rcShow = true;
let rcFeaturesRepo = [];

const state = {};
Object.defineProperty(state, 'mode', {
  get: function() {
    return this._mode || '';
  },
  set: function(mode) {
    this._mode = mode;
    const modeStr = mode;

    [ selectedMode, selectedType ] = modeStr.split('-');
    featureType = selectedType === 'NODE' ? 'Point' : 'LineString';

    console.log(`selectedMode: ${selectedMode}, selectedType: ${selectedType}`)

    if (selectedMode === 'CREATE') {
      removeAllInteraction();
      addDrawInteraction();
    } else if(selectedMode === 'MODIFY') {
      removeAllInteraction();
      addModifyInteraction();
    } else {
      removeAllInteraction();
      addSelectInteraction();
    }

    if (LINK_GRID_INSTANCE && FROM_NODE_GRID_INSTANCE && TO_NODE_GRID_INSTANCE) {
      setGridEditable()
    }

  },
});

// map object define
const styleFunction = function (feature) {
  const props = feature.getProperties();
  const geometry = feature.getGeometry();
  let styles = [
    // linestring
    new Style({
      stroke: new Stroke({
        color: targetFeature && (feature.getId() === targetFeature.getId()) ? '#0000ff' : '#ffcc33',
        width: 4,
      }),
      zIndex: 999
    }),
  ];

  if (map.getView().getZoom() > 16) {
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
          src: targetFeature && (feature.getId() === targetFeature.getId()) ? BlueArrowImg : NormalArrowImg,
          color: targetFeature && (feature.getId() === targetFeature.getId()) ? '#0000ff' : '#ffcc33',
          anchor: [0.75, 0.5],
          opacity: map.getView().getZoom() > 16 ? 1 : 0,
          scale: [1.5, 1.5],
          rotateWithView: true,
          rotation: -all_rotation,
        }),
        zIndex: 999
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
                src: targetFeature && (feature.getId() === targetFeature.getId()) ? BlueArrowImg : NormalArrowImg,
                color: targetFeature && (feature.getId() === targetFeature.getId()) ? '#0000ff' : '#ffcc33',
                opacity: map.getView().getZoom() > 16 ? 1 : 0,
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
          color: '#f00'
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
          color: '#f00'
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
        color: 'rgba(110, 170, 255, 0.8)',
        width: 4,
      }),
      zIndex: 100
    }),
  ];

  let from = geometry.getFirstCoordinate();
  let to = geometry.getLastCoordinate();

  let segCount = 0;

  if (map.getView().getZoom() > 20) {

    geometry.forEachSegment(function (start, end) {
      let regularShapeStyle = new Style({
        image: new RegularShape({
          radius: 4,
          points:4,
          fill: new Fill({
            color: 'rgba(240, 105, 255, 0.7)'
          })
        }),
        zIndex: 100,
        geometry: new MultiPoint(start, end)
      })
      styles.push(regularShapeStyle);
    });

  } else if (map.getView().getZoom() > 18) {
    let fromToRegularShapeStyle = new Style({
      image: new RegularShape({
        radius: 4,
        points:4,
        fill: new Fill({
          color: 'rgba(240, 105, 255, 0.7)'
        })
      }),
      zIndex: 100,
      geometry: new MultiPoint(from, to)
    })
    styles.push(fromToRegularShapeStyle);

    geometry.forEachSegment(function (start, end) {

      segCount++;
      if(segCount % 3 === 0) {
        let regularShapeStyle = new Style({
          image: new RegularShape({
            radius: 4,
            points:4,
            fill: new Fill({
              color: 'rgba(240, 105, 255, 0.7)'
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

const source = new VectorSource({
  features: new Collection(),
  wrapX: false
});
const layer = new VectorLayer({
  source: source
});

let select, draw, snap, modify, split, undoInteraction;


// ---------- grid ---------------------------

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

// GLOBAL_VALUE

let SHOW_USE_YN = 'Y';

let DATA_REPO_TEMPLATE =
{
  LINK_DATA_REPO: {
    LINK_ID: '',
    UP_FROM_NODE: '',
    UP_TO_NODE: '',
    UP_LANES: '',
    DOWN_FROM_NODE: '',
    DOWN_TO_NODE: '',
    DOWN_LANES: '',
    ROAD_NAME: '',
    FIRST_DO: '',
    FIRST_GU: '',
    LEFT_TURN_TYPE: '',
    EX_POCKET: '',
    IS_CHANGE_LANES: '',
    WKT: '',
    FROM_NODE_DATA_REPO: {
      NODE_ID: '',
      NODE_TYPE: '',
      TRAFFIC_LIGHT: '',
      NODE_NAME: '',
      DISTRICT_ID: '',
      DISTRICT_ID2: '',
      WKT: ''
    },
    TO_NODE_DATA_REPO: {
      NODE_ID: '',
      NODE_TYPE: '',
      TRAFFIC_LIGHT: '',
      NODE_NAME: '',
      DISTRICT_ID: '',
      DISTRICT_ID2: '',
      WKT: ''
    }
  }
}

let DATA_REPO = [

]
let DELETE_DATA_REPO = [];
Object.defineProperty(DATA_REPO, 'data', {
    get: function () {
      return this || [];
    },
    set: function (data) {
      // this._data = data;
      // const repoData = data;
      // console.log(repoData)
      console.log(DATA_REPO);
      console.log(DELETE_DATA_REPO);
    }
  }
)

// ---------- global value define end ---------

document.addEventListener('DOMContentLoaded', function() {
  initMap();
  initGrid();
  domEventRegister();

  setGridEditable();
  // getFeaturesByZone('');
})

// add event listener
function domEventRegister() {

  // document.getElementById('CREATE-NODE-BTN').addEventListener('click', (e) => {
  //   state.mode = 'CREATE-NODE';
  // })
  document.getElementById('CREATE-LINK-BTN').addEventListener('click', (e) => {
    state.mode = 'CREATE-LINK';
  })

  document.getElementById('MODIFY-BTN').addEventListener('click', (e) => {
    state.mode = 'MODIFY';
  })

  // document.getElementById('MODIFY-NODE-BTN').addEventListener('click', (e) => {
  //   state.mode = 'MODIFY-NODE';
  // })
  // document.getElementById('MODIFY-LINK-BTN').addEventListener('click', (e) => {
  //   state.mode = 'MODIFY-LINK';
  // })

  document.getElementById('SELECT-BTN').addEventListener('click', (e) => {
    state.mode = 'SELECT';
  })

  document.getElementById('SAVE_BTN').addEventListener('click', (e) => {
    console.log('나 불림');
    applyData();
  })

  document.getElementById('UNDO_BTN').addEventListener('click', (e) => {
    // targetFeature.getGeometry().setCoordinates(redoGeometryInfo);
    undoInteraction.undo();
  })

  document.getElementById('REDO_BTN').addEventListener('click', (e) => {
    // targetFeature.getGeometry().setCoordinates(redoGeometryInfo);
    undoInteraction.redo();
  })

  document.getElementById('sgg-sb').addEventListener('change', (e) => {
    source.clear();
    getFeaturesByZone('');
  })

  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && state.mode === "MODIFY") {
      map.removeInteraction(modify);
      addSplitInteraction();
    }

  });

  document.addEventListener("keyup", (e) => {
    if (!e.shiftKey && split) {
      map.removeInteraction(split);
      map.addInteraction(modify);
    }
  });

  Hotkeys('ctrl+s', function(event, handler) {
    // Prevent the default refresh event under WINDOWS system
    event.preventDefault()
    applyData();
  })

  Hotkeys('num_add', function(event, handler) {
    event.preventDefault()

    let format = new WKT(),
    wkt = format.writeGeometry(displayZoneFeature.getGeometry());

    getRcLineByZone(wkt);


  });

  Hotkeys('num_subtract', function(event, handler) {
    event.preventDefault()

    source.getFeatures().forEach(v => {
      if (v.get("featureType") === 'RCLINE') {
        source.removeFeature(v);
      }
    })

  });

  Hotkeys('ctrl+r', function(event, handler) {
    event.preventDefault()
    clearing();
  });

  Hotkeys('ctrl+y', function(event, handler) {
    // Prevent the default refresh event under WINDOWS system
    event.preventDefault()
    SHOW_USE_YN = 'Y';

    let format = new WKT();
    let wkt = format.writeGeometry(displayZoneFeature.getGeometry());

    if (document.getElementById('sgg-sb').value === 'none') {
      getFeaturesByZone(wkt);
    } else {
      getFeaturesByZone('');
    }

    unselectAllFeature();
  })

  Hotkeys('ctrl+n', function(event, handler) {
    // Prevent the default refresh event under WINDOWS system
    event.preventDefault()
    SHOW_USE_YN = 'N';

    let format = new WKT();
    let wkt = format.writeGeometry(displayZoneFeature.getGeometry());

    if (document.getElementById('sgg-sb').value === 'none') {
      getFeaturesByZone(wkt);
    } else {
      getFeaturesByZone('');
    }

    unselectAllFeature();
  })
}

function initMap() {

  map = new Map({
    target: 'map',
    layers: [
      common._baseMapLayer,
      common._baseMapInfoLayer,
      layer
    ],
    view: common._mainMapView,
    loadTilesWhileAnimating: true
  });

  map.on('pointermove', function(e) {
    map.getTargetElement().style.cursor = map.hasFeatureAtPixel(e.pixel) ? 'pointer' : '';
  })

  map.on('moveend', function(e) {
    // zoom 할 수록 커짐
    let newZoom = map.getView().getZoom();

    if (newZoom > 16) {
      let nowDisplayExtent = getExtent();

      let displayZonePolygon = fromExtent(nowDisplayExtent);

      displayZoneFeature = new Feature({
        geometry: displayZonePolygon
      })

      let format = new WKT(),
      wkt = format.writeGeometry(displayZoneFeature.getGeometry());

      if (document.getElementById('sgg-sb').value === 'none') {
        getFeaturesByZone(wkt);
      }
      getRcLineByZone(wkt);
    }

  });

  map.on('click', function(e) {
    const isFeature = map.hasFeatureAtPixel(e.pixel);

    if (!isFeature) {
      unselectAllFeature();
    }
  })

  map.getViewport().addEventListener('contextmenu', function (evt) {
    evt.preventDefault();
    const pixel = map.getEventPixel(evt)
    console.log(pixel);
    map.forEachFeatureAtPixel(pixel, function(_f) {
      console.log(_f);
      console.log(_f.get("featureType"))
      if (_f.get("featureType") === "LINK") {

        const isConfirm = confirm("삭제하시겠습니까?");
        if (isConfirm) {
          deleteData(_f.get("LINK_ID"),"LINK")
        }

      }
    })

  })


  let layerSwitcher = new LayerSwitcher({
    groupSelectStyle: 'children' // Can be 'children' [default], 'group' or 'none'
  });
  map.addControl(layerSwitcher);

  addSelectInteraction();
  state.mode = 'SELECT';

  addUndoRedoInteraction();
}

function initGrid() {

  LINK_GRID_INSTANCE = new Grid({
    el: document.getElementById('grid'), // Container element
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

function removeAllInteraction() {
  map.removeInteraction(select);
  map.removeInteraction(draw);
  map.removeInteraction(modify);
  map.removeInteraction(split);

  if (LINK_GRID_INSTANCE) {
    LINK_GRID_INSTANCE.setColumns(DEFAULT_COLUMN);
  }
  if (FROM_NODE_GRID_INSTANCE) {
    FROM_NODE_GRID_INSTANCE.setColumns(DEFAULT_COLUMN);
  }
  if (TO_NODE_GRID_INSTANCE) {
    TO_NODE_GRID_INSTANCE.setColumns(DEFAULT_COLUMN);
  }
}

function unselectAllFeature() {
  targetFeature = null;
  select.getFeatures().clear();
  LINK_GRID_INSTANCE.resetData([]);
  FROM_NODE_GRID_INSTANCE.resetData([]);
  TO_NODE_GRID_INSTANCE.resetData([]);
}

function addSelectInteraction() {
  select = new Select({
    source: layer.getSource(),
    filter: function(f, l) {

      if (f.get('featureType') === "LINK") {
        return true;
      } else {
        return false;
      }

    },
    multi: true,
    style: styleFunction
  })

  select.getFeatures().on(
    "add",
    function (e) {

      const selectFeatures = select.getFeatures();

      if (targetFeature) {
        const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
        const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
        const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

        let today = new Date();
        let format = new WKT();

        let nowLinkId = lgdata.LINK_ID;

        let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

        let dataTemplate =
            {
              REPO_ID: lgdata.LINK_ID,
              SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
              LINK_DATA_REPO: {
                LINK_ID: lgdata.LINK_ID,
                UP_FROM_NODE: lgdata.UP_FROM_NODE,
                UP_TO_NODE: lgdata.UP_TO_NODE,
                UP_LANES: lgdata.UP_LANES,
                DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
                DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
                DOWN_LANES: lgdata.DOWN_LANES,
                FIRST_DO: lgdata.FIRST_DO,
                FIRST_GU: lgdata.FIRST_GU,
                LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
                EX_POCKET: lgdata.EX_POCKET,
                IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
                WKT: format.writeGeometry(targetFeature.getGeometry()).replace("(", " (").replace(",",", "),
                FROM_NODE_DATA_REPO: {
                  NODE_ID: fgdata.NODE_ID,
                  NODE_TYPE: fgdata.NODE_TYPE,
                  TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
                  NODE_NAME: fgdata.NODE_NAME,
                  DISTRICT_ID: fgdata.DISTRICT_ID,
                  DISTRICT_ID2: fgdata.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
                },
                TO_NODE_DATA_REPO: {
                  NODE_ID: tgdata.NODE_ID,
                  NODE_TYPE: tgdata.NODE_TYPE,
                  TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
                  NODE_NAME: tgdata.NODE_NAME,
                  DISTRICT_ID: tgdata.DISTRICT_ID,
                  DISTRICT_ID2: tgdata.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
                }
              }
            };

        if (isInclude) {
          DATA_REPO = DATA_REPO.map(v => {
            if (v.REPO_ID === nowLinkId) {
              // console.log('이미 포함됐던 애: dataTemplate로 대체');
              return dataTemplate;
            }
            return v;
          })
        } else {
          DATA_REPO.push(dataTemplate);
        }

        targetFeature.setProperties({
          ...targetFeature.getProperties(), ...dataTemplate.LINK_DATA_REPO
        })

      }

      if (!e.element) {
        return;
      }
      targetFeature = e.element;

      if (state.mode === 'SELECT') {
        redoGeometryInfo = e.element.getGeometry().getCoordinates();
      }

      const fromNode = e.element.get('UP_FROM_NODE');
      const toNode = e.element.get('UP_TO_NODE');
      const linkId = e.element.get('LINK_ID');

      let format = new WKT();
      let today = new Date();

      const asynGetNodeData = async () => {
        const result = await getNodeData(fromNode, toNode)
            .then((data) => {

              console.log('console2')

              if (!e.element.get("FROM_NODE_DATA_REPO")) {
                console.log("FROM_NODE_DATA_REPO 없음")
                const fromNodeGridData = convertObject(FROM_NODE_GRID_INSTANCE.getData());

                const fromNodeDataRepoObj = {
                  NODE_ID: fromNodeGridData.NODE_ID,
                  NODE_TYPE: fromNodeGridData.NODE_TYPE,
                  TRAFFIC_LIGHT: fromNodeGridData.TRAFFIC_LIGHT,
                  NODE_NAME: fromNodeGridData.NODE_NAME,
                  DISTRICT_ID: fromNodeGridData.DISTRICT_ID,
                  DISTRICT_ID2: fromNodeGridData.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(e.element.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
                }

                e.element.set("FROM_NODE_DATA_REPO", fromNodeDataRepoObj);
              }

              if (!e.element.get("TO_NODE_DATA_REPO")) {
                console.log("TO_NODE_DATA_REPO 없음")
                const toNodeGridData = convertObject(TO_NODE_GRID_INSTANCE.getData());

                const toNodeDataRepoObj = {
                  NODE_ID: toNodeGridData.NODE_ID,
                  NODE_TYPE: toNodeGridData.NODE_TYPE,
                  TRAFFIC_LIGHT: toNodeGridData.TRAFFIC_LIGHT,
                  NODE_NAME: toNodeGridData.NODE_NAME,
                  DISTRICT_ID: toNodeGridData.DISTRICT_ID,
                  DISTRICT_ID2: toNodeGridData.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(e.element.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
                }

                e.element.set("TO_NODE_DATA_REPO", toNodeDataRepoObj);
              }

              // 한 노드만 기존재하는 경우에 대한 처리
              if (fromNode.substring(0,2) === "SL") {
                setGridData({
                  NODE_ID: fromNode,
                  NODE_TYPE: '',
                  NODE_NAME: '',
                  TRAFFIC_LIGHT: '',
                  DISTRICT_ID: '',
                  DISTRICT_ID2: ''
                }, 'FROM_NODE');
              }
              if (toNode.substring(0,2) === "SL") {
                setGridData({
                  NODE_ID: toNode,
                  NODE_TYPE: '',
                  NODE_NAME: '',
                  TRAFFIC_LIGHT: '',
                  DISTRICT_ID: '',
                  DISTRICT_ID2: ''
                }, 'TO_NODE');
              }
            })
          .then(() => {
            const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
            const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
            const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

            let nowLinkId = linkId;

            let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

            let dataTemplate =
            {
              REPO_ID: lgdata.LINK_ID,
              SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
              LINK_DATA_REPO: {
                LINK_ID: lgdata.LINK_ID,
                UP_FROM_NODE: lgdata.UP_FROM_NODE,
                UP_TO_NODE: lgdata.UP_TO_NODE,
                UP_LANES: lgdata.UP_LANES,
                DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
                DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
                DOWN_LANES: lgdata.DOWN_LANES,
                ROAD_NAME: lgdata.ROAD_NAME,
                FIRST_DO: lgdata.FIRST_DO,
                FIRST_GU: lgdata.FIRST_GU,
                LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
                EX_POCKET: lgdata.EX_POCKET,
                IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
                WKT: format.writeGeometry(e.element.getGeometry()).replace("(", " (").replace(",",", "),
                FROM_NODE_DATA_REPO: {
                  NODE_ID: fgdata.NODE_ID,
                  NODE_TYPE: fgdata.NODE_TYPE,
                  TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
                  NODE_NAME: fgdata.NODE_NAME,
                  DISTRICT_ID: fgdata.DISTRICT_ID,
                  DISTRICT_ID2: fgdata.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(e.element.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
                },
                TO_NODE_DATA_REPO: {
                  NODE_ID: tgdata.NODE_ID,
                  NODE_TYPE: tgdata.NODE_TYPE,
                  TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
                  NODE_NAME: tgdata.NODE_NAME,
                  DISTRICT_ID: tgdata.DISTRICT_ID,
                  DISTRICT_ID2: tgdata.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(e.element.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
                }
              }
            };

            if (isInclude) {
              DATA_REPO = DATA_REPO.map(v => {
                if (v.REPO_ID === nowLinkId) {
                  console.log('이미 포함됐던 애: dataTemplate로 대체');
                  return dataTemplate;
                }
                return v;
              })
            } else {
              DATA_REPO.push(dataTemplate);
            }

            e.element.setProperties({
              ...e.element.getProperties(), ...dataTemplate.LINK_DATA_REPO
            })

          })

        console.log(DATA_REPO);
        console.log(DELETE_DATA_REPO);
      }

      asynGetNodeData();

      setGridData(e.element, 'LINK');

    }
  );


  map.addInteraction(select);

  addSnapInteraction();
}

function addDrawInteraction() {
  draw = new Draw({
    source: layer.getSource(),
    type: featureType,
  });
  map.addInteraction(draw);

  draw.on('drawstart', function(e) {
    console.log('draw start');
  })

  draw.on('drawend', function(e) {

    let today = new Date();

    const key = makeKey();

    const f = e.feature;
    const format = new WKT();

    f.setId(key);
    f.setProperties({
      'featureType': 'LINK',
      'LINK_ID': "CL" + key,
      'UP_FROM_NODE': '',
      'UP_TO_NODE': '',
      'UP_LANES': '',
      'ROAD_NAME': '',
      'DOWN_FROM_NODE': '',
      'DOWN_TO_NODE': '',
      'DOWN_LANES': '',
      'FIRST_DO': '',
      'FIRST_GU': '',
      'LEFT_TURN_TYPE': '',
      'EX_POCKET': '',
      'IS_CHANGE_LANES': '',
      'WKT': format.writeGeometry(f.getGeometry()).replace("(", " (").replace(",",", "),
    })
    f.setStyle(styleFunction)

    const firstCoordinateOfDrawFeature = source.getFeaturesAtCoordinate(f.getGeometry().getFirstCoordinate());
    const lastCoordinateOfDrawFeature = source.getFeaturesAtCoordinate(f.getGeometry().getLastCoordinate());

    let nodeArray = [];

    const loopLimit = firstCoordinateOfDrawFeature.length <= lastCoordinateOfDrawFeature.length ? lastCoordinateOfDrawFeature.length : firstCoordinateOfDrawFeature.length;

    for(let i=0; i<loopLimit; i++) {
      const fromTarget = firstCoordinateOfDrawFeature[i];

      if (fromTarget) {
        nodeArray.push(fromTarget.get("UP_FROM_NODE"));
        nodeArray.push(fromTarget.get("UP_TO_NODE"));
      }
      const toTarget = lastCoordinateOfDrawFeature[i];

      if (toTarget) {
        nodeArray.push(toTarget.get("UP_FROM_NODE"));
        nodeArray.push(toTarget.get("UP_TO_NODE"));
      }
    }

    const uniqueNodeArray = Array.from(new Set(nodeArray)).filter(v => v != null);

    targetFeature = e.feature;

    if (uniqueNodeArray.length > 0) { // 기존재하는 노드 간 연결

      const _f = getNodeGroup(uniqueNodeArray).then((data) => {

        let fromNodeOfDrawFeature = null;
        let toNodeOfDrawFeature = null;

        const firstCoordinateOfNodeGroup = source.getFeaturesAtCoordinate(f.getGeometry().getFirstCoordinate()).find(v => v.get("featureType") === "NODE");
        const lastCoordinateOfNodeGroup = source.getFeaturesAtCoordinate(f.getGeometry().getLastCoordinate()).find(v => v.get("featureType") === "NODE");

        fromNodeOfDrawFeature = firstCoordinateOfNodeGroup
                                ? JSON.parse(JSON.stringify(firstCoordinateOfNodeGroup.getProperties()))
                                : {
                                  DATA_TYPE: 'FROM',
                                  NODE_ID: "CFN" + key,
                                  NODE_TYPE: '',
                                  NODE_NAME: '',
                                  TRAFFIC_LIGHT: '',
                                  DISTRICT_ID: '',
                                  DISTRICT_ID2: ''
                                }
                                ;
        toNodeOfDrawFeature = lastCoordinateOfNodeGroup
                                ? JSON.parse(JSON.stringify(lastCoordinateOfNodeGroup.getProperties()))
                                : {
                                  DATA_TYPE: 'TO',
                                  NODE_ID: "CTN" + key,
                                  NODE_TYPE: '',
                                  NODE_NAME: '',
                                  TRAFFIC_LIGHT: '',
                                  DISTRICT_ID: '',
                                  DISTRICT_ID2: ''
                                }
                                ;

        console.log('나임');

        const fromNode = fromNodeOfDrawFeature.NODE_ID;
        f.set("UP_FROM_NODE", fromNode);
        const toNode = toNodeOfDrawFeature.NODE_ID;
        f.set("UP_TO_NODE", toNode);
        const gnData = async () => {
          await getNodeData(fromNode, toNode).then((data) => {
            // 한 노드만 기존재하는 경우에 대한 처리
            if (fromNode === ("CFN" + key)) {
              setGridData(fromNodeOfDrawFeature, 'FROM_NODE');
            }
            if (toNode === ("CTN" + key)) {
              setGridData(toNodeOfDrawFeature, 'TO_NODE');
            }

            setGridData(f, 'LINK');
            return data;
          }).then((data) => {
            for(let i=0; i<data.length; i++) {
              source.removeFeature(data[i])
            }

            const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
            const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
            const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

            let nowLinkId = f.LINK_ID;

            let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

            console.log(fgdata);
            console.log(tgdata);

            let dataTemplate =
            {
              REPO_ID: lgdata.LINK_ID,
              SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
              LINK_DATA_REPO: {
                LINK_ID: lgdata.LINK_ID,
                UP_FROM_NODE: lgdata.UP_FROM_NODE,
                UP_TO_NODE: lgdata.UP_TO_NODE,
                UP_LANES: lgdata.UP_LANES,
                DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
                DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
                DOWN_LANES: lgdata.DOWN_LANES,
                ROAD_NAME: lgdata.ROAD_NAME,
                FIRST_DO: lgdata.FIRST_DO,
                FIRST_GU: lgdata.FIRST_GU,
                LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
                EX_POCKET: lgdata.EX_POCKET,
                IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
                WKT: format.writeGeometry(targetFeature.getGeometry()).replace("(", " (").replace(",",", "),
                FROM_NODE_DATA_REPO: {
                  NODE_ID: fgdata.NODE_ID,
                  NODE_TYPE: fgdata.NODE_TYPE,
                  TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
                  NODE_NAME: fgdata.NODE_NAME,
                  DISTRICT_ID: fgdata.DISTRICT_ID,
                  DISTRICT_ID2: fgdata.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
                },
                TO_NODE_DATA_REPO: {
                  NODE_ID: tgdata.NODE_ID,
                  NODE_TYPE: tgdata.NODE_TYPE,
                  TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
                  NODE_NAME: tgdata.NODE_NAME,
                  DISTRICT_ID: tgdata.DISTRICT_ID,
                  DISTRICT_ID2: tgdata.DISTRICT_ID2,
                  WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
                }
              }
            };

            if (isInclude) {
              DATA_REPO = DATA_REPO.map(v => {
                if (v.REPO_ID === nowLinkId) {
                  console.log('이미 포함됐던 애: dataTemplate로 대체');
                  return dataTemplate;
                }
                return v;
              })
            } else {
              DATA_REPO.push(dataTemplate);
            }

            targetFeature.setProperties({
              ...targetFeature.getProperties(), ...dataTemplate.LINK_DATA_REPO
            })

            console.log(targetFeature.getProperties());
            console.log(DATA_REPO);
          });
        };

        gnData();

        return data;
      })

    } else { // 양 노드가 신규생성인 경우

      f.set("UP_FROM_NODE", "CFN" + key);
      f.set("UP_TO_NODE", "CTN" + key);

      setGridData(e.feature, 'LINK');

      setGridData({
        DATA_TYPE: 'FROM',
        NODE_ID: "CFN" + key,
        NODE_TYPE: '',
        NODE_NAME: '',
        TRAFFIC_LIGHT: '',
        DISTRICT_ID: '',
        DISTRICT_ID2: ''
      }, 'FROM_NODE');

      setGridData({
        DATA_TYPE: 'TO',
        NODE_ID: "CTN" + key,
        NODE_TYPE: '',
        NODE_NAME: '',
        TRAFFIC_LIGHT: '',
        DISTRICT_ID: '',
        DISTRICT_ID2: ''
      }, 'TO_NODE');

      const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
      const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
      const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

      let nowLinkId = lgdata.LINK_ID;

      let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

      let dataTemplate =
      {
        REPO_ID: lgdata.LINK_ID,
        SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
        LINK_DATA_REPO: {
          LINK_ID: lgdata.LINK_ID,
          UP_FROM_NODE: lgdata.UP_FROM_NODE,
          UP_TO_NODE: lgdata.UP_TO_NODE,
          UP_LANES: lgdata.UP_LANES,
          DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
          DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
          DOWN_LANES: lgdata.DOWN_LANES,
          ROAD_NAME: lgdata.ROAD_NAME,
          FIRST_DO: lgdata.FIRST_DO,
          FIRST_GU: lgdata.FIRST_GU,
          LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
          EX_POCKET: lgdata.EX_POCKET,
          IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
          WKT: format.writeGeometry(targetFeature.getGeometry()).replace("(", " (").replace(",",", "),
          FROM_NODE_DATA_REPO: {
            NODE_ID: fgdata.NODE_ID,
            NODE_TYPE: fgdata.NODE_TYPE,
            TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
            NODE_NAME: fgdata.NODE_NAME,
            DISTRICT_ID: fgdata.DISTRICT_ID,
            DISTRICT_ID2: fgdata.DISTRICT_ID2,
            WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
          },
          TO_NODE_DATA_REPO: {
            NODE_ID: tgdata.NODE_ID,
            NODE_TYPE: tgdata.NODE_TYPE,
            TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
            NODE_NAME: tgdata.NODE_NAME,
            DISTRICT_ID: tgdata.DISTRICT_ID,
            DISTRICT_ID2: tgdata.DISTRICT_ID2,
            WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
          }
        }
      };

      if (isInclude) {
        DATA_REPO = DATA_REPO.map(v => {
          if (v.REPO_ID === nowLinkId) {
            console.log('이미 포함됐던 애: dataTemplate로 대체');
            return dataTemplate;
          }
          return v;
        })
      } else {
        DATA_REPO.push(dataTemplate);
      }

      targetFeature.setProperties({
        ...targetFeature.getProperties(), ...dataTemplate.LINK_DATA_REPO
      })

      console.log(DATA_REPO);

    }






  })

  addSnapInteraction();
}

function addModifyInteraction() {

  modify = new Modify({
    source: source,
    pixelTolerance: 15,
    wrapX: false,
    condition: function(e) {
      const targetFeatureTypes = [];

      map.forEachFeatureAtPixel(e.pixel, function(_target) {
        if (_target.get("featureType")) {
          targetFeatureTypes.push(_target.get("featureType"));
        }
      })

      const uniqueTargetFeatureTypes = Array.from(new Set(targetFeatureTypes));
      const isAvailable = !uniqueTargetFeatureTypes.includes("RCLINE") && uniqueTargetFeatureTypes.includes("LINK");

      return isAvailable;
    }
  });

  modify.on('modifystart', function(e) {

    targetFeature = e.features.getArray()[0];

    if (targetFeature.get('FROM_NODE_DATA_REPO')) {
      setGridData(targetFeature.get('FROM_NODE_DATA_REPO'), 'FROM_NODE');
      setGridData(targetFeature.get('TO_NODE_DATA_REPO'), 'TO_NODE');
    } else {
      const fromNode = targetFeature.get('UP_FROM_NODE');
      const toNode = targetFeature.get('UP_TO_NODE');
      getNodeData(fromNode, toNode);
    }

    setGridData(targetFeature, 'LINK');
    redoGeometryInfo = e.features.getArray()[0].getGeometry().getCoordinates();
    // 아예 속성정보에 최초 좌표정보를 갖고 있는게 좋을 듯
  })

  modify.on('modifyend', function(f) {

    const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
    const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
    const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

    let today = new Date();
    let format = new WKT();

    let nowLinkId = lgdata.LINK_ID;

    let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

    let dataTemplate =
    {
      REPO_ID: lgdata.LINK_ID,
      SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
      LINK_DATA_REPO: {
        LINK_ID: lgdata.LINK_ID,
        UP_FROM_NODE: lgdata.UP_FROM_NODE,
        UP_TO_NODE: lgdata.UP_TO_NODE,
        UP_LANES: lgdata.UP_LANES,
        DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
        DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
        DOWN_LANES: lgdata.DOWN_LANES,
        ROAD_NAME: lgdata.ROAD_NAME,
        FIRST_DO: lgdata.FIRST_DO,
        FIRST_GU: lgdata.FIRST_GU,
        LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
        EX_POCKET: lgdata.EX_POCKET,
        IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
        WKT: format.writeGeometry(targetFeature.getGeometry()).replace("(", " (").replace(",",", "),
        FROM_NODE_DATA_REPO: {
          NODE_ID: fgdata.NODE_ID,
          NODE_TYPE: fgdata.NODE_TYPE,
          TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
          NODE_NAME: fgdata.NODE_NAME,
          DISTRICT_ID: fgdata.DISTRICT_ID,
          DISTRICT_ID2: fgdata.DISTRICT_ID2,
          WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
        },
        TO_NODE_DATA_REPO: {
          NODE_ID: tgdata.NODE_ID,
          NODE_TYPE: tgdata.NODE_TYPE,
          TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
          NODE_NAME: tgdata.NODE_NAME,
          DISTRICT_ID: tgdata.DISTRICT_ID,
          DISTRICT_ID2: tgdata.DISTRICT_ID2,
          WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
        }
      }
    };

    if (isInclude) {
      DATA_REPO = DATA_REPO.map(v => {
        if (v.REPO_ID === nowLinkId) {
          console.log('이미 포함됐던 애: dataTemplate로 대체');
          return dataTemplate;
        }
        return v;
      })
    } else {
      DATA_REPO.push(dataTemplate);
    }

    targetFeature.setProperties({
      ...targetFeature.getProperties(), ...dataTemplate.LINK_DATA_REPO
    })

    console.log(targetFeature.getProperties());
  })

  map.addInteraction(modify);

  // addSplitInteraction();
  addSnapInteraction();
}

function addSnapInteraction() {
  snap = new Snap({
    source: layer.getSource()
  });
  map.addInteraction(snap);
}

function addSplitInteraction() {
  split = new Split(
  {
    sources: source
  });

  split.on('beforesplit', function(e, a, b) {
    console.log('beforesplit');
    const origin = e.original;

    DATA_REPO = DATA_REPO.filter(v => {
      return v.REPO_ID !== origin.get("LINK_ID")
    })

    DELETE_DATA_REPO.push(origin.get("LINK_ID"));
  })

  split.on('aftersplit', function(e, a, b) {
    console.log('aftersplit');

    const firstLink = e.features[0];
    const secondLink = e.features[1];

    const originLinkId = firstLink.get("LINK_ID");
    console.log(originLinkId);

    let format = new WKT();
    let key = makeKey();

    firstLink.setProperties({
      ...firstLink.getProperties(),
      UP_TO_NODE: "SL" + key,
      DOWN_FROM_NODE: "SL" + key,
      WKT: format.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", "),
      TO_NODE_DATA_REPO: {
        NODE_ID: "SL" + key,
        NODE_TYPE: '',
        TRAFFIC_LIGHT: '',
        NODE_NAME: '',
        DISTRICT_ID: '',
        DISTRICT_ID2: '',
        WKT: format.writeGeometry(new Point(firstLink.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
      }
    })

    firstLink.set("LINK_ID", firstLink.get("UP_FROM_NODE") + "_" + firstLink.get("UP_TO_NODE"))
    firstLink.setId(firstLink.get("LINK_ID"));

    console.log(firstLink.get("UP_FROM_NODE") + "_" + firstLink.get("UP_TO_NODE"));
    console.log(secondLink.get("UP_FROM_NODE") + "_" + firstLink.get("UP_TO_NODE"));

    secondLink.setProperties({
      ...secondLink.getProperties(),
      UP_FROM_NODE: "SL" + key,
      DOWN_TO_NODE: "SL" + key,
      WKT: format.writeGeometry(secondLink.getGeometry()).replace("(", " (").replace(",",", "),
      FROM_NODE_DATA_REPO: {
        NODE_ID: 'SL' + key,
        NODE_TYPE: '',
        TRAFFIC_LIGHT: '',
        NODE_NAME: '',
        DISTRICT_ID: '',
        DISTRICT_ID2: '',
        WKT: format.writeGeometry(new Point(secondLink.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
      }
    })

    secondLink.set("LINK_ID", secondLink.get("UP_FROM_NODE") + "_" + secondLink.get("UP_TO_NODE"))
    secondLink.setId(secondLink.get("LINK_ID"));

    console.log(firstLink.get("UP_FROM_NODE") + "_" + firstLink.get("UP_TO_NODE"));
    console.log(secondLink.get("UP_FROM_NODE") + "_" + secondLink.get("UP_TO_NODE"));

    const fLinkProps = firstLink.getProperties();
    const sLinkProps = secondLink.getProperties();
    console.log(fLinkProps);
    console.log(sLinkProps);

    unselectAllFeature();
    select.getFeatures().push(secondLink);

    const checkRepo = setInterval(() => {
      const checkSecondLinkRepo = DATA_REPO.some(v => {
        return v.REPO_ID === secondLink.getId()
      });

      if (checkSecondLinkRepo) {
        clearInterval(checkRepo)
        unselectAllFeature();
        select.getFeatures().push(firstLink);
      }
    }, 10)

  })

  map.addInteraction(split);
}

function addUndoRedoInteraction() {
  // Undo redo interaction
  undoInteraction = new UndoRedo();
  map.addInteraction(undoInteraction);
}

function getExtent() {
  return map.getView().calculateExtent();
}

function getFeaturesByZone(_displayZoneWKT) {
  axios.post(`${common.API_PATH}/api/linkByZone`, {
    wkt: _displayZoneWKT,
    sggCode: document.getElementById('sgg-sb').value
  })
  .then(({ data }) => {

    makeLinkFeatures(data);

  })
  .catch(function (error) {
    console.log(error);
  });

}

function getRcLineByZone(_displayZoneWKT) {
  axios.post(`${common.API_PATH}/api/getRcline`, {
    wkt: _displayZoneWKT
  })
  .then(({ data }) => {

    makeRcLineFeatures(data);

  })
  .catch(function (error) {
    console.log(error);
  });
}

function getNodeData(_fromNode, _toNode) {
  return axios.post(`${common.API_PATH}/api/node`, {
    fromNode: _fromNode,
    toNode: _toNode
  })
  .then(({ data }) => {

    data.forEach((v) => {
      const newObj = {
        DATA_TYPE: v.data_type,
        NODE_ID: v.node_id,
        NODE_TYPE: v.node_type,
        NODE_NAME: v.node_name,
        TRAFFIC_LIGHT: v.traffic_light,
        DISTRICT_ID: v.district_id,
        DISTRICT_ID2: v.district_id2
      }

      if (v.data_type === 'FROM') {
        setGridData(newObj, 'FROM_NODE');
      } else {
        setGridData(newObj, 'TO_NODE');
      }
    })

    return data;
  })
  .then((data) => {
    return data;
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
    // if (d.link_id === '474621090') {
    //   console.log(d);
    //   console.log(d.use_yn);
    //   console.log(SHOW_USE_YN)
    // }
    if (d.use_yn !== SHOW_USE_YN) {
      let removeTarget = source.getFeatureById(d.link_id);
      if (removeTarget) {
        source.removeFeature(removeTarget)
      }

      continue;
    };
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
      'UP_LANES': d.up_lanes,
      'ROAD_NAME': d.road_name,
      'DOWN_FROM_NODE': d.down_from_node,
      'DOWN_TO_NODE': d.down_to_node,
      'DOWN_LANES': d.down_lanes,
      'FIRST_DO': d.first_do,
      'FIRST_GU': d.first_gu,
      'LEFT_TURN_TYPE': d.left_turn_type || '',
      'EX_POCKET': d.ex_pocket || '',
      'IS_CHANGE_LANES': d.is_change_lanes || '',
      'WKT': d.wkt
    })
    source.addFeature(_feature);
    _feature.setStyle(styleFunction)
  }

}

function makeRcLineFeatures(_data) {

  const dataLength = _data.length;
  const format = new WKT();

  rcFeaturesRepo = [];

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

function setGridData(_data, _dataType) {
  // { name: 컬럼명, value: 값 }

  let props = null;

  if (_dataType === 'LINK') {
    props = _data.getProperties()
  } else {
    props = _data;
    delete props.DATA_TYPE;
  }

  const columnNames = [];

  for (let key in props) {
    columnNames.push(key.toUpperCase());
  }

  const dataMap = columnNames.filter(v => v !== 'USE_YN' && v !== 'GEOMETRY' && v !== 'FEATURETYPE' && v !== 'WKT' && v != 'FROM_NODE_DATA_REPO' && v != 'TO_NODE_DATA_REPO').map(v => {
    return {
      name: v,
      value: props[v]
    }
  })

  if(_dataType === 'LINK') {
    LINK_GRID_INSTANCE.resetData(dataMap);
  } else if (_dataType === 'FROM_NODE') {
    FROM_NODE_GRID_INSTANCE.resetData(dataMap);
  } else if (_dataType === 'TO_NODE') {
    TO_NODE_GRID_INSTANCE.resetData(dataMap);
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
      editor: 'text',
      onBeforeChange(ev) {
        console.log('Before change:');
        console.log(ev);
      },
      onAfterChange(ev) {
        console.log('After change:');
        const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
        const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
        const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

        let today = new Date();
        let format = new WKT();

        let nowLinkId = lgdata.LINK_ID;

        let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

        let dataTemplate =
        {
          REPO_ID: lgdata.LINK_ID,
          SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
          LINK_DATA_REPO: {
            LINK_ID: lgdata.LINK_ID,
            UP_FROM_NODE: lgdata.UP_FROM_NODE,
            UP_TO_NODE: lgdata.UP_TO_NODE,
            UP_LANES: lgdata.UP_LANES,
            DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
            DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
            DOWN_LANES: lgdata.DOWN_LANES,
            FIRST_DO: lgdata.FIRST_DO,
            FIRST_GU: lgdata.FIRST_GU,
            LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
            EX_POCKET: lgdata.EX_POCKET,
            IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
            WKT: format.writeGeometry(targetFeature.getGeometry()).replace("(", " (").replace(",",", "),
            FROM_NODE_DATA_REPO: {
              NODE_ID: fgdata.NODE_ID,
              NODE_TYPE: fgdata.NODE_TYPE,
              TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
              NODE_NAME: fgdata.NODE_NAME,
              DISTRICT_ID: fgdata.DISTRICT_ID,
              DISTRICT_ID2: fgdata.DISTRICT_ID2,
              WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
            },
            TO_NODE_DATA_REPO: {
              NODE_ID: tgdata.NODE_ID,
              NODE_TYPE: tgdata.NODE_TYPE,
              TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
              NODE_NAME: tgdata.NODE_NAME,
              DISTRICT_ID: tgdata.DISTRICT_ID,
              DISTRICT_ID2: tgdata.DISTRICT_ID2,
              WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
            }
          }
        };

        if (isInclude) {
          DATA_REPO = DATA_REPO.map(v => {
            if (v.REPO_ID === nowLinkId) {
              console.log('이미 포함됐던 애: dataTemplate로 대체');
              return dataTemplate;
            }
            return v;
          })
        } else {
          DATA_REPO.push(dataTemplate);
        }

        targetFeature.setProperties({
          ...targetFeature.getProperties(), ...dataTemplate.LINK_DATA_REPO
        })

        console.log(targetFeature.getProperties());


      }
    }
  ];

  LINK_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
  FROM_NODE_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
  TO_NODE_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
}

// save data

function convertObject(_arrayData) {

  let obj = {};

  for (let i=0; i<_arrayData.length; i++) {
    const t = _arrayData[i];
    const key = t.name;
    const value = t.value;
    obj[key] = value;
  }

  return obj;
}

function applyData() {
  console.log('APPLY_DATA')

  if (targetFeature) {
    let today = new Date();

    const lgdata = convertObject(LINK_GRID_INSTANCE.getData());
    const fgdata = convertObject(FROM_NODE_GRID_INSTANCE.getData());
    const tgdata = convertObject(TO_NODE_GRID_INSTANCE.getData());

    let format = new WKT();

    let nowLinkId = lgdata.LINK_ID;

    let isInclude = DATA_REPO.find(v => v.REPO_ID === nowLinkId);

    let dataTemplate =
    {
      REPO_ID: lgdata.LINK_ID,
      SAVE_TM: String(today.getHours()) + String(today.getMinutes()) + String(today.getSeconds()) + String(today.getMilliseconds()),
      LINK_DATA_REPO: {
        LINK_ID: lgdata.LINK_ID,
        UP_FROM_NODE: lgdata.UP_FROM_NODE,
        UP_TO_NODE: lgdata.UP_TO_NODE,
        UP_LANES: lgdata.UP_LANES,
        DOWN_FROM_NODE: lgdata.DOWN_FROM_NODE,
        DOWN_TO_NODE: lgdata.DOWN_TO_NODE,
        DOWN_LANES: lgdata.DOWN_LANES,
        ROAD_NAME: lgdata.ROAD_NAME,
        FIRST_DO: lgdata.FIRST_DO,
        FIRST_GU: lgdata.FIRST_GU,
        LEFT_TURN_TYPE: lgdata.LEFT_TURN_TYPE,
        EX_POCKET: lgdata.EX_POCKET,
        IS_CHANGE_LANES: lgdata.IS_CHANGE_LANES,
        WKT: format.writeGeometry(targetFeature.getGeometry()).replace("(", " (").replace(",",", "),
        FROM_NODE_DATA_REPO: {
          NODE_ID: fgdata.NODE_ID,
          NODE_TYPE: fgdata.NODE_TYPE,
          TRAFFIC_LIGHT: fgdata.TRAFFIC_LIGHT,
          NODE_NAME: fgdata.NODE_NAME,
          DISTRICT_ID: fgdata.DISTRICT_ID,
          DISTRICT_ID2: fgdata.DISTRICT_ID2,
          WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
        },
        TO_NODE_DATA_REPO: {
          NODE_ID: tgdata.NODE_ID,
          NODE_TYPE: tgdata.NODE_TYPE,
          TRAFFIC_LIGHT: tgdata.TRAFFIC_LIGHT,
          NODE_NAME: tgdata.NODE_NAME,
          DISTRICT_ID: tgdata.DISTRICT_ID,
          DISTRICT_ID2: tgdata.DISTRICT_ID2,
          WKT: format.writeGeometry(new Point(targetFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
        }
      }
    };

    if (isInclude) {
      DATA_REPO = DATA_REPO.map(v => {
        if (v.REPO_ID === nowLinkId) {
          console.log('이미 포함됐던 애: dataTemplate로 대체');
          return dataTemplate;
        }
        return v;
      })
    } else {
      DATA_REPO.push(dataTemplate);
    }

    targetFeature.setProperties({
      ...targetFeature.getProperties(), ...dataTemplate.LINK_DATA_REPO
    })

    // zone
    const fromNode = targetFeature.get("UP_FROM_NODE");
    const toNode = targetFeature.get("UP_TO_NODE");

    let nowDisplayExtent = getExtent();
    let nowDisplayFeatures = source.getFeaturesInExtent(nowDisplayExtent).filter(v => {
      // return v.getId() !== targetFeature.getId() && ((v.get("UP_FROM_NODE") === fromNode || v.get("UP_TO_NODE") === toNode) || (v.get("UP_TO_NODE") === fromNode || v.get("UP_TO_NODE") === toNode))
      return ((v.get("UP_FROM_NODE") === fromNode || v.get("UP_TO_NODE") === toNode) || (v.get("UP_TO_NODE") === fromNode || v.get("UP_TO_NODE") === toNode))
    });

    let selectTarget = [...nowDisplayFeatures];
    let selectedFeatures = [];

    let iter = 0;

    let ITER_MAP = {};
    selectTarget.forEach((v => {

      const key = v.getId();
      ITER_MAP[key] = false;

    }))

    console.log(ITER_MAP);

    let intervalFunction = setInterval(() => {

      if (checkInRepo(ITER_MAP) === "ALL_IN_REPO") {
        console.log(checkInRepo(ITER_MAP));
        return clearInterval(intervalFunction);
      }

      let tf = selectTarget.find(v => {
        return v.getId() === checkInRepo(ITER_MAP)
      });

      unselectAllFeature();
      select.getFeatures().push(tf);

      console.log(ITER_MAP);
      console.log(checkInRepo(ITER_MAP));

    }, 150)

    // let intervalFunction = setInterval(() => {
    //
    //   if (iter === selectTarget.length) {
    //     console.log(checkInRepo(ITER_MAP));
    //     return clearInterval(intervalFunction);
    //   }
    //
    //   let tf = selectTarget[iter];
    //   unselectAllFeature();
    //   select.getFeatures().push(tf);
    //
    //   let checkSecondLinkRepo = DATA_REPO.some(v => {
    //     return v.REPO_ID === tf.getId()
    //   });
    //
    //   if (checkSecondLinkRepo) {
    //     iter++;
    //   } else {
    //
    //     if (iter === selectTarget.length) {
    //       console.log(checkInRepo(ITER_MAP));
    //       return clearInterval(intervalFunction);
    //     }
    //
    //   }
    //
    // }, 1000)





    // saveData("XXX")
  }


}

function checkInRepo(_map) {
  let checkResult = "ALL_IN_REPO";

  for(let key in _map){
    let checkSecondLinkRepo = DATA_REPO.some(v => {
      return v.REPO_ID === key
    });

    if (!checkSecondLinkRepo) {
      checkResult = key
    }
  }

  return checkResult;
}

function saveData(_dataType) {

  const urlPrefix = `${common.API_PATH}/api`;

  let sendData;

  // console.log(targetFeature.getProperties());


  // const targetFeatureGeometry = targetFeature.getGeometry();
  // let format = new WKT();
  // let wktRepresenation;
  // console.log(wktRepresenation);

  // let tempPoint;

  // switch (_dataType) {
  //   case 'LINK':
  //     sendData = DATA_REPO.LINK_DATA_REPO;
  //     wktRepresenation = format.writeGeometry(targetFeatureGeometry);
  //     break;
  //   case 'FROM_NODE':
  //   case 'TO_NODE':
  //     sendData = _dataType === 'FROM_NODE' ? DATA_REPO.FROM_NODE_DATA_REPO : DATA_REPO.TO_NODE_DATA_REPO;
  //     tempPoint = new Feature({ geometry: _dataType === 'FROM_NODE' ? new Point(targetFeatureGeometry.getFirstCoordinate()) : new Point(targetFeatureGeometry.getLastCoordinate()) });
  //     console.log(tempPoint);
  //     wktRepresenation = format.writeGeometry(tempPoint.getGeometry());
  //     break;
  // }

  // sendData.WKT = wktRepresenation.replace("("," (").replace(",",", ");

  // console.log(sendData);

  console.log(DATA_REPO);

  // axios.post(`${urlPrefix}/saveData/${_dataType}`, sendData)
  axios.post(`${urlPrefix}/saveData`, DATA_REPO)
  .then(({ data }) => {



    if (data) {
      clearing();
      alert('저장되었습니다.');
    }

  })
  .catch(function (error) {
    console.log(error);
  });

}

function getNodeGroup(_nodeGroup) {

  let featuresArray = [];

  const fArray = axios.post(`${common.API_PATH}/api/getNodeGroup`, {
    nodes: _nodeGroup
  })
  .then(({ data }) => {

    let format = new WKT()

    for (let i=0; i<data.length; i++) {
      const d = data[i];
      let _feature = format.readFeature(d.wkt,  {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326'
      });
      _feature.setId(d.node_id);
      _feature.setProperties({
        'featureType': 'NODE',
        'NODE_ID': d.node_ID,
        'NODE_NAME': d.node_NAME,
        'NODE_TYPE': d.node_TYPE,
        'TRAFFIC_LIGHT': d.traffic_LIGHT,
        'DISTRICT_ID': d.district_ID,
        'DISTRICT_ID2': d.district_ID2,
        'WKT': d.wkt
      })
      featuresArray.push(_feature);
      source.addFeature(_feature);
    }

    return featuresArray
  })
  .then((data) => {
    return data;
  })
  .catch(function (error) {
    console.log(error);
  });

  return fArray;
}

function makeKey() {
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
  DATA_REPO = [];
  DELETE_DATA_REPO = [];
  targetFeature = null;

  let format = new WKT(),
  wkt = format.writeGeometry(displayZoneFeature.getGeometry());

  source.clear();

  if (document.getElementById('sgg-sb').value === 'none') {
    getFeaturesByZone(wkt);
  } else {
    getFeaturesByZone('');
  }

  getRcLineByZone(wkt);


}

function deleteData(_id, _dataType) {
  axios.post(`${common.API_PATH}/api/deleteData`, {
      id: _id,
      dataType: _dataType
    })
    .then(({ data }) => {

      console.log(data);
      clearing();
      alert('저장되었습니다.');

    })
    .catch(function (error) {
      console.log(error);
    });
}
