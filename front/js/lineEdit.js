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
import {DragBox, Modify, Snap, Select, Draw, defaults as defaultInteractions} from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer} from 'ol/layer';
import { Icon, Text, Fill, Circle as CircleStyle, Stroke, Style, RegularShape } from 'ol/style';
import Point from 'ol/geom/Point';
import Circle from 'ol/geom/Circle';
import { buffer } from 'ol/extent';
import MultiPoint from 'ol/geom/MultiPoint';
import {never, altKeyOnly, shiftKeyOnly, platformModifierKeyOnly, singleClick, click} from 'ol/events/condition';

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
import {LineString, Polygon} from "ol/geom";
import Split from "ol-ext/interaction/Split";
import * as olSphere from "ol/sphere";
import LayerSwitcher from "ol-layerswitcher";

// global value
let LINK_DATA = null;
let NODE_DATA = null;
let FACILITY_DATA = null;

let SESSION_UID = null;
let SESSION_SUFFIX = null;

let CIRCLE_RADIUS = 0.0000005;

let map = null;
let roadView;
let roadViewClient;

let GRID_SET_LINK_ID = null;

const markerSource = new VectorSource({});
const markerLayer = new VectorLayer({
  source: markerSource
});

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(6),
  projection: 'EPSG:4326',
  className: 'custom-mouse-position',
  target: document.getElementById('mouse-position'),
});

const rvSource = new VectorSource({
  features: new Collection(),
  // wrapX: false
});
const rvLayer = new VectorLayer({
  source: rvSource,
  style: new Style({
        image: new CircleStyle({
              radius: 6,
              fill: new Fill({color: 'rgba(255, 192, 8, 0.6)'})
          }),
        zIndex: 999,
      })
});

const tempNodeSource = new VectorSource();
const tempLayer = new VectorLayer({
  source: tempNodeSource
});

const facilitySource = new VectorSource({
  features: new Collection(),
  wrapX: false
});
const facilityLayer = new VectorLayer({
  source: facilitySource
});
const facStyleFunc = function (feature) {

    const selectedFeaturesId = getSelectedFeaturesId();

    return new Style({
                image: new CircleStyle({
                      radius: 8,
                      fill: new Fill({
                          color: selectedFeaturesId.includes(feature.getId()) ? 'rgb(255,0,0)' : 'rgb(217,0,255)'
                      })
                  }),
                zIndex: 999,
              })
}

const source = new VectorSource({
  features: new Collection(),
  // wrapX: false
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
    style: function(feature) {

      let commnt = feature.get("commnt");

      return new Style({
              image: new CircleStyle({
                    radius: 13,
                    fill: new Fill({
                        color: commnt === '20220803' ? 'rgba(255,0,234,0.6)' : 'rgba(255, 0, 0, 0.6)'
                    })
                }),
              zIndex: 999,
            })
    }
});

let displayZoneFeature = null;

let saveDataArchive = [];
let facSaveDataArchive = [];

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

let SHOW_USE_YN = 'Y';
let SHOW_EDIT_TY = 'ALL';

let targetFeature = null;

// interactionValue
let select, snap, modify, undoInteraction, draw, split;
let facSelect, facDraw, facSnap, facModify;
//

// grid value

let LINK_GRID_INSTANCE;
let FROM_NODE_GRID_INSTANCE;
let TO_NODE_GRID_INSTANCE;
let FAC_GRID_INSTANCE;

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

let DELETE_FEATURES_ID = [];
let EXCLUDE_FEATURES_ID = [];

class CustomTextEditor {
  constructor(props) {
    const el = document.createElement('input');
    const { maxLength } = props.columnInfo.editor.options;

    el.type = 'text';
    // el.maxLength = maxLength;
    el.value = String(props.value);

    this.el = el;
  }

  getElement() {
    return this.el;
  }

  getValue() {
    return this.el.value;
  }

  mounted() {
    this.el.select();
  }
}

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initGrid();

    getSmInter();

    addSelectInteraction();
    addFacSelectInteraction();
    addDrawBoxInteraction();
    addUndoInteraction();
    // addModifyInteraction();
    // addDrawInteraction();
    // addSnapInteraction();

    domEventRegister();

    setSession();
    roadViewInit();

    setInterval(sessionCheck, 1000 * 60 * 10); // 10분
    // setInterval(sessionCheck, 10000); // 10분

    changeSido();
    changeSgg();

    // document.querySelector('#search-area').addEventListener('click', changeSido);
    // document.querySelector('#search-sido').addEventListener('click', changeSgg);

})

function domEventRegister() {

    window.addEventListener('beforeunload', (event) => {
        // 표준에 따라 기본 동작 방지
        event.preventDefault();
        // Chrome에서는 returnValue 설정이 필요함
        expireSession()
        // event.returnValue = '';
    });


    document.getElementById('FAC-MNG-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }

        buttonStyleToggle(document.getElementById('FAC-MNG-BTN'));

        const isOn = document.getElementById('FAC-MNG-BTN').classList.contains('btn-primary');

        allInteractionOff()
        clearing();

        if (isOn) {
            addFacModifyInteraction();
            addFacDrawInteraction();
            addFacSnapInteraction();
            document.getElementById('fac-grid-zone').style.display = 'block';
            document.getElementById('main-grid-zone').style.display = 'none';

            if (!FAC_GRID_INSTANCE) {
                FAC_GRID_INSTANCE = new Grid({
                    el: document.getElementById('fac-grid'), // Container element
                    rowHeight: 30,
                    minRowHeight: 0,
                    scrollX: false,
                    minBodyHeight: 450,
                    bodyHeight: 450,
                    columns: DEFAULT_COLUMN
                });

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

              FAC_GRID_INSTANCE.on('afterChange', (ev) => {
                const changes = ev.changes[0];
                const rowInfo = FAC_GRID_INSTANCE.getRowAt(changes.rowKey);
                const changeColumnName = rowInfo.name;
                const changeValue = rowInfo.value;

                const FAC_GRID_DATA = FAC_GRID_INSTANCE.getData();
                const FAC_ID = FAC_GRID_DATA.find(v => v.name === "FAC_ID").value;

                const feature = facilitySource.getFeatureById(FAC_ID);
                feature.set(changeColumnName, changeValue);
              })

              FAC_GRID_INSTANCE.setColumns(EDITABLE_COLUMN);
            }
        }
    })


    document.getElementById('UNDO_BTN').addEventListener('click', (e) => {
        undoInteraction.undo();
        wktUpdate();
    })

    document.getElementById('REDO_BTN').addEventListener('click', (e) => {
        undoInteraction.redo();
        wktUpdate();
    })

    document.getElementById('SAVE_BTN').addEventListener('click', (e) => {

        const isFacMode = document.getElementById('FAC-MNG-BTN').classList.contains('btn-primary');

        if (!isFacMode) {
            applyData();
        } else {
            applyData('fac');
        }
    })

    // 22.07.08 장혜진 : 조회기능 추가
    document.getElementById('search-feature-btn').addEventListener('click', (e) => {
        const inputText = document.getElementById('search-feature').value;

        // hjjang : 유형 확인을 위한 값 조회
        const inputType = document.getElementById('search-type');
        const inputValue = inputType.options[inputType.selectedIndex].value;

        // hjjang : 유형별 함수 호출
        if(inputValue == 'link') {
            getSingleLink(inputText);
        } else if(inputValue == 'node') {
            getSingleNode(inputText);
        } else {
            getSingleXy(inputText);}
    })

    // Use Array.forEach to add an event listener to each checkbox.
    document.querySelectorAll("input[type=checkbox][name=sgg]").forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
          clearing();
      })
    });

    document.getElementById('CREATE-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }

        // 22.07.14 장혜진 : wkt 미저장에 대한 처리
        alert("생성에 필요한 데이터를 구성 작업을 시작합니다.");
        const inputText = 'TEST';
        updateWktfGeom(inputText);
    })

    document.getElementById('MODIFY-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }
        buttonStyleToggle(document.getElementById('MODIFY-BTN'));

        const isOn = document.getElementById('MODIFY-BTN').classList.contains('btn-primary');

        allInteractionOff();
        clearing();

        if (isOn) {
            addModifyInteraction();
            addSnapInteraction();
            document.getElementById('main-grid-zone').style.display = 'block';
            document.getElementById('fac-grid-zone').style.display = 'none';
        }
    })

    document.getElementById('SPLIT-BTN').addEventListener('click', () => {
        const isContinue = confirm('저장하지않은 내용은 사라집니다.\n진행합니까?');
        if (!isContinue) {
            return false;
        }
        buttonStyleToggle(document.getElementById('SPLIT-BTN'));

        const isOn = document.getElementById('SPLIT-BTN').classList.contains('btn-primary');

        allInteractionOff();
        clearing();

        if (isOn) {
            addSplitInteraction();
            document.getElementById('main-grid-zone').style.display = 'block';
            document.getElementById('fac-grid-zone').style.display = 'none';
        }
    })

    document.getElementById('ROADVIEW-BTN').addEventListener('click', roadViewToggle())

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

    Hotkeys('ctrl+l', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        SHOW_EDIT_TY = 'ALL'
        map.dispatchEvent('moveend');
    })

    Hotkeys('ctrl+k', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        SHOW_EDIT_TY = null;
        map.dispatchEvent('moveend');
    })

    Hotkeys('delete', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()

        const isConfirm = confirm('선택된 형상들을 삭제하시겠습니까?')
        if (isConfirm) {
            const isFacMode = document.getElementById('FAC-MNG-BTN').classList.contains('btn-primary');

            if (!isFacMode) {
                select.getFeatures().forEach(function(_f) {
                    deleteData(_f.get("LINK_ID"),"LINK")
                })
            } else {
                facSelect.getFeatures().forEach(function(_f) {
                    deleteData(_f.get("FAC_ID"), "FACILITY");
                })
            }

            alert('저장되었습니다.');
        }


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

    Hotkeys('ctrl+z', function(event, handler) {
        // Prevent the default refresh event under WINDOWS system
        event.preventDefault()
        undoInteraction.undo();
    })
}

function initMap() {
    map = new Map({
        target: 'map',
        layers: [
          common._baseMapLayer,
          common._baseMapInfoLayer,
          smLayer,
          facilityLayer,
          layer,
          tempLayer,
          rvLayer,
          markerLayer
        ],
        view: common._mainMapView,
        loadTilesWhileAnimating: true,
        controls: defaultControls().extend([mousePositionControl]),
        interactions: defaultInteractions({
            shiftDragZoom :false
        }),
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

        }
    })

    map.on('click', function(evt) {
        evt.preventDefault();

        if (draw) {
            let isDrawActive = draw.getActive();

            let isAltPressed = altKeyOnly(evt);
            let isShiftPressed = shiftKeyOnly(evt);
            let isPlatformKeyPressed = platformModifierKeyOnly(evt);

            if (isDrawActive && (!isPlatformKeyPressed && !isAltPressed && isShiftPressed)) {
              draw.finishDrawing();
            }
        }

        const isRvOn = document.getElementById('ROADVIEW-BTN').classList.contains('btn-warning');
        let coords = (evt.coordinate).reverse();

        if (isRvOn) {
            let position = new kakao.maps.LatLng(coords[0], coords[1]);// 특정 위치의 좌표와 가까운 로드뷰의 panoId를 추출하여 로드뷰를 띄운다.
            roadViewClient.getNearestPanoId(position, 50, function(panoId) {
                roadView.setPanoId(panoId, position); //panoId와 중심좌표를 통해 로드뷰 실행
                let [rvPY, rvPX] = roadView.getPosition().toString().replace("(","").replace(")","").replace(" ","").split(",");
                let [rvPositionY, rvPositionX] = [Number(rvPY), Number(rvPX)];

                rvSource.clear();
                let rvFeature = new Feature({
                    geometry: new Point([rvPositionX, rvPositionY])
                })
                rvSource.addFeature(rvFeature);
            });
        }

    })

    map.getViewport().addEventListener('contextmenu', function (evt) {
        evt.preventDefault();

        const pixel = map.getEventPixel(evt)
        const coords = map.getEventCoordinate(evt);
        let target = null;

        const selectedFeatures = select.getFeatures();
        const idMaps = selectedFeatures.getArray().map(v => v.getId());

        const COORDS_CIRCLE = new Circle(coords, CIRCLE_RADIUS)

        const isFacMode = document.getElementById('FAC-MNG-BTN').classList.contains('btn-primary');

        let intersect;
        if (!isFacMode) {
            intersect = source.getFeaturesInExtent(COORDS_CIRCLE.getExtent());

            let dist = 999999999999999;

            intersect.forEach(function(v) {
                if (v.get("featureType") === "LINK") {
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

            if (target) {
                if (NODE_DATA) {
                    setNodeData(target);
                }
                pushSaveData(target);
                setGridData(target);

                if (idMaps.includes(target.getId())) {
                    selectedFeatures.forEach((sf) => {
                        if (sf && target) {
                            // if (sf.getId() === target.getId()) {
                            //     selectedFeatures.remove(sf);
                            // }
                        }
                    })
                } else {
                    select.getFeatures().push(target);
                }

                source.dispatchEvent('change');
            }
        } else {

            facSelect.getFeatures().clear();
            let temp = [];

            map.forEachFeatureAtPixel(pixel, function(_z) {
                if (_z.get("featureType") === "FACILITY") {
                    temp.push(_z);
                }
            })

            let dist = 999999999999999;

            temp.forEach(function(v) {
                let compareDist = olSphere.getDistance(coords, v.getGeometry().getCoordinates())
                if (compareDist < dist) {
                    target = v;
                    dist = compareDist;
                }
            })

            if (target) {

                facSelect.getFeatures().push(target);
                setGridData(target, 'fac')
                pushSaveData(target, 'fac');
            }
            facilitySource.dispatchEvent('change');

        }

    })


}

function roadViewInit() {
    const roadViewContainer = document.getElementById('innerMap'); //로드뷰를 표시할 div

    roadView = new kakao.maps.Roadview(roadViewContainer); //로드뷰 객체
    roadViewClient = new kakao.maps.RoadviewClient(); //좌표로부터 로드뷰 파노ID를 가져올 로드뷰 helper객체

    let position = new kakao.maps.LatLng(33.450701, 126.570667);// 특정 위치의 좌표와 가까운 로드뷰의 panoId를 추출하여 로드뷰를 띄운다.
    roadViewClient.getNearestPanoId(position, 50, function(panoId) {
        roadView.setPanoId(panoId, position); //panoId와 중심좌표를 통해 로드뷰 실행
    });

}

function initGrid() {

  LINK_GRID_INSTANCE = new Grid({
    el: document.getElementById('link-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    scrollX: false,
    minBodyHeight: 450,
    bodyHeight: 450,
    columns: DEFAULT_COLUMN
  });

  FROM_NODE_GRID_INSTANCE = new Grid({
    el: document.getElementById('from-node-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    width: 280,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 220,
    bodyHeight: 220,
    columns: DEFAULT_COLUMN
  });

  TO_NODE_GRID_INSTANCE = new Grid({
    el: document.getElementById('to-node-grid'), // Container element
    rowHeight: 30,
    minRowHeight: 0,
    width: 280,
    scrollX: false,
    scrollY: false,
    minBodyHeight: 220,
    bodyHeight: 220,
    columns: DEFAULT_COLUMN
  });

  // LINK_GRID_INSTANCE.resetData(newData); // Call API of instance's public method

  Grid.applyTheme('striped'); // Call API of static method

  setGridEditable();

}

// interactions

// 22.07.26 hjjang : 시도별 기능 추가
function changeSido() {
    const add = $("#search-area option:selected").val();

    const sido_1 = document.getElementById("search-sido");
    const sido_2 = document.getElementById("search-all");

    const sgg_1 = document.getElementById("search-inch");
    const sgg_2 = document.getElementById("search-buch");
    const sgg_3 = document.getElementById("search-anyg");

    if (add == "one") {
        sido_1.style.display = "inline";
        $("#search-sido option:eq(0)").prop("selected", true);
        sido_2.style.display = "none";
        sgg_1.style.display = "inline";

        $('#sgg_inch_23320').prop('checked', false);
        $('#sgg_inch_23060').prop('checked', false);
        $('#sgg_inch_23080').prop('checked', false);
        $('#sgg_inch_23010').prop('checked', false);
        $('#sgg_inch_23050').prop('checked', false);
        $('#sgg_inch_23070').prop('checked', false);
        $('#sgg_inch_23040').prop('checked', false);
        $('#sgg_inch_23310').prop('checked', false);
        $('#sgg_inch_23090').prop('checked', false);
        $('#sgg_inch_23020').prop('checked', false);
    } else {
        sido_1.style.display = "none";
        sido_2.style.display = "inline";
        sgg_1.style.display = "none";

        $('#sgg_inch_23320').prop('checked', false);
        $('#sgg_inch_23060').prop('checked', false);
        $('#sgg_inch_23080').prop('checked', false);
        $('#sgg_inch_23010').prop('checked', false);
        $('#sgg_inch_23050').prop('checked', false);
        $('#sgg_inch_23070').prop('checked', false);
        $('#sgg_inch_23040').prop('checked', false);
        $('#sgg_inch_23310').prop('checked', false);
        $('#sgg_inch_23090').prop('checked', false);
        $('#sgg_inch_23020').prop('checked', false);
    }
    sgg_2.style.display = "none";
    sgg_3.style.display = "none";

    $('#sgg_buch_31050').prop('checked', false);
    $('#sgg_anyg_99999').prop('checked', false);

    clearing();
}

// 22.07.26 hjjang : 시군구별 기능 추가
function changeSgg() {
    const add = $("#search-sido option:selected").val();

    const sgg_1 = document.getElementById("search-inch");
    const sgg_2 = document.getElementById("search-buch");
    const sgg_3 = document.getElementById("search-anyg");

    if (add == "inch") {
        sgg_1.style.display = "inline";
        sgg_2.style.display = "none";
        sgg_3.style.display = "none";

        $('#sgg_inch_23320').prop('checked', false);
        $('#sgg_inch_23060').prop('checked', false);
        $('#sgg_inch_23080').prop('checked', false);
        $('#sgg_inch_23010').prop('checked', false);
        $('#sgg_inch_23050').prop('checked', false);
        $('#sgg_inch_23070').prop('checked', false);
        $('#sgg_inch_23040').prop('checked', false);
        $('#sgg_inch_23310').prop('checked', false);
        $('#sgg_inch_23090').prop('checked', false);
        $('#sgg_inch_23020').prop('checked', false);
        $('#sgg_buch_31050').prop('checked', false);
        $('#sgg_anyg_99999').prop('checked', false);
    } else if (add == "buch") {
        sgg_1.style.display = "none";
        sgg_2.style.display = "inline";
        sgg_3.style.display = "none";
        $('#sgg_inch_23320').prop('checked', false);
        $('#sgg_inch_23060').prop('checked', false);
        $('#sgg_inch_23080').prop('checked', false);
        $('#sgg_inch_23010').prop('checked', false);
        $('#sgg_inch_23050').prop('checked', false);
        $('#sgg_inch_23070').prop('checked', false);
        $('#sgg_inch_23040').prop('checked', false);
        $('#sgg_inch_23310').prop('checked', false);
        $('#sgg_inch_23090').prop('checked', false);
        $('#sgg_inch_23020').prop('checked', false);
        $('#sgg_anyg_99999').prop('checked', false);
        $('#sgg_buch_31050').prop('checked', true);
    } else if (add == "anyg") {
        sgg_1.style.display = "none";
        sgg_2.style.display = "none";
        sgg_3.style.display = "inline";
        $('#sgg_inch_23320').prop('checked', false);
        $('#sgg_inch_23060').prop('checked', false);
        $('#sgg_inch_23080').prop('checked', false);
        $('#sgg_inch_23010').prop('checked', false);
        $('#sgg_inch_23050').prop('checked', false);
        $('#sgg_inch_23070').prop('checked', false);
        $('#sgg_inch_23040').prop('checked', false);
        $('#sgg_inch_23310').prop('checked', false);
        $('#sgg_inch_23090').prop('checked', false);
        $('#sgg_inch_23020').prop('checked', false);
        $('#sgg_buch_31050').prop('checked', false);
        $('#sgg_anyg_99999').prop('checked', true);
    }
    clearing();
}

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
        multi: false,
        wrapX: false
    })

    let selectedFeatures = select.getFeatures();

    selectedFeatures.on('add', function(e) {

        selectedFeatures.forEach(function(value) {
            const target = value;
            if (target.get("featureType") === "LINK") {
                if (NODE_DATA) {
                    setNodeData(target);
                }
                pushSaveData(target);
            }
        });

        source.dispatchEvent('change');

    })

    selectedFeatures.on('remove', function(value) {
        if (selectedFeatures.getArray().length === 0) {
            LINK_GRID_INSTANCE.resetData([]);
            FROM_NODE_GRID_INSTANCE.resetData([]);
            TO_NODE_GRID_INSTANCE.resetData([]);
            GRID_SET_LINK_ID = null;
            source.dispatchEvent('change');
        }
    })

    map.addInteraction(select);
}

function addFacSelectInteraction() {
    facSelect = new Select({
        source: facilitySource,
        filter: function(f, l) {

          if (f.get('featureType') === "LINK") {
            return false;
          } else {
            return true;
          }

        }
    })

    let facSelectedFeatures = facSelect.getFeatures();

    facSelectedFeatures.on('add', function(e) {

        facSelectedFeatures.forEach(function (value) {
            const target = value;
            if (target.get("FAC_ID")) {
                pushSaveData(value, 'fac')
            }

        })

    })
}

function addModifyInteraction() {
    modify = new Modify({
        features: select.getFeatures(),
        // source: select.getSource(),
        pixelTolerance: 15,
        // wrapX: false
    });

    modify.on('modifyend', function(e) {
        wktUpdate();
    })

    map.addInteraction(modify);
}

function addFacModifyInteraction() {
    facModify = new Modify({
        source: facilitySource,
        pixelTolerance: 15,
        // wrapX: false
    });

    facModify.on('modifyend', function(e) {
        facSelect.getFeatures().extend(e.features.getArray());
        wktUpdate('fac');
    })

    map.addInteraction(facModify);
}

function addSnapInteraction() {
    snap = new Snap({
        source: source
    });
    map.addInteraction(snap);
}

function addFacSnapInteraction() {
    facSnap = new Snap({
        source: facilitySource
    });
    map.addInteraction(facSnap);
}

function addUndoInteraction() {
    // Undo redo interaction
    undoInteraction = new UndoRedo();
    map.addInteraction(undoInteraction);
}

function addDrawBoxInteraction() {
    // a DragBox interaction used to select features by drawing boxes
    const dragBox = new DragBox({
      condition: function(evt) {
          let isAltPressed = altKeyOnly(evt);
          let isShiftPressed = shiftKeyOnly(evt);
          let isPlatformKeyPressed = platformModifierKeyOnly(evt);

          if (isPlatformKeyPressed && !isAltPressed && !isShiftPressed) {
              return true;
          } else {
              return false;
          }
      }
    });

    let selectedFeatures = select.getFeatures();
    let facSelectedFeatures = facSelect.getFeatures();

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on('boxstart', function () {
      selectedFeatures.clear();
      facSelectedFeatures.clear();
    });

    dragBox.on('boxend', function () {
      const extent = dragBox.getGeometry().getExtent();
      const boxFeatures = source.getFeaturesInExtent(extent).filter((feature) => feature.getGeometry().intersectsExtent(extent));
      selectedFeatures.extend(boxFeatures);
      const facBoxFeatures = facilitySource.getFeaturesInExtent(extent).filter((feature) => feature.getGeometry().intersectsExtent(extent));
      facSelectedFeatures.extend(facBoxFeatures);
    });

    map.addInteraction(dragBox);
}

function addDrawInteraction() {
    draw = new Draw({
        source: source,
        freehandCondition: never, // <-- add this line
        condition: function(e) {
            // when the point's button is 1(leftclick), allows drawing
              if (e.originalEvent.buttons === 1) {
                return true;
              } else {
                return false;
              }
        },
        type: "LineString"
    });

    draw.on('drawstart', function(e) {
        e.feature.setStyle(styleFunction);
        tempNodeSource.clear();
    })

    draw.on('drawend', function(e) {
        const drawFeature = e.feature;

        const wktFormat = new WKT();

        drawFeature.setProperties({
            'featureType': 'LINK',
            'LINK_ID': "CL" + makeTimeKey() + SESSION_SUFFIX,
            'UP_FROM_NODE': '',
            'UP_TO_NODE': '',
            'UP_LANES': '',
            'ROAD_NAME': '',
            'DOWN_FROM_NODE': '',
            'DOWN_TO_NODE': '',
            'DOWN_LANES': '',
            'FIRST_DO': '',
            'FIRST_GU': '',
            'LEFT_TURN_UP_DOWN': '',
            'LANE_CHANGE': '',
            'EX_POCKET_NUM': '',
            'EDIT_YN': '',
            'USER_1': '',
            'USER_2': '',
            'USER_3': '',
            'USER_4': '',
            'ROAD_RANK': '101',
            'FACILITY_KIND': '0',
            'NAVI_LV' : '',
            'KOTI_LV' : '',
            'LEN' : '',
            'ST_DIR' : '',
            'ED_DIR' : '',
            'LINK_CATEGORY' : '',
            'ONEWAY' : '',
            'WDTH' : '',
            'LANES' : '',
            'TOLL_NAME' : '',
            'ROAD_FACILITY_NAME' : '',
            'ROAD_NO' : '',
            'HOV_BUSLANE' : '',
            'SHOV_BUSLANE' : '',
            'AUTOEXCUSIVE' : '',
            'NUM_CROSS' : '',
            'BARRIER' : '',
            'MAXSPEED' : '-1',
            'TL_DENSITY' : '',
            'TRAF_ID_P' : '',
            'TRAF_ID_N' : '',
            'WKT': wktFormat.writeGeometry(drawFeature.getGeometry()).replace("(", " (").replace(",",", ")
        })
        drawFeature.setId(drawFeature.get("LINK_ID"));

        const firstCoords = drawFeature.getGeometry().getFirstCoordinate();
        const lastCoords = drawFeature.getGeometry().getLastCoordinate();

        const intersect = source.getFeaturesInExtent(drawFeature.getGeometry().getExtent());

        if (intersect.length > 0) {
            let uniqueNodes = [];

            intersect.forEach(v => {
                uniqueNodes.push(v.get("UP_FROM_NODE"));
                uniqueNodes.push(v.get("UP_TO_NODE"));
            })

            uniqueNodes = Array.from(new Set(uniqueNodes));

            if (!NODE_DATA) return;

            const nodeMap = uniqueNodes.map(v => {
                return NODE_DATA.find(v2 => v2.node_id === v);
            }).filter(v => v);

            nodeMap.forEach(v => {

                let _feature = wktFormat.readFeature(v.wkt,  {
                  dataProjection: 'EPSG:4326',
                  featureProjection: 'EPSG:4326'
                });
                _feature.setProperties({
                    featureType: 'NODE',
                    NODE_ID: v.node_id,
                    NODE_TYPE: v.node_type,
                    NODE_NAME: v.node_name,
                    TRAFFIC_LIGHT: v.traffic_light,
                    DISTRICT_ID: v.district_id,
                    DISTRICT_ID2: v.district_id2,
                    EDIT_YN: v.edit_yn,
                    WKT: v.wkt
                })
                tempNodeSource.addFeature(_feature);
            })

        }


        const FIRST_COORDS_CIRCLE = new Circle(firstCoords, CIRCLE_RADIUS)
        const FIRST_CIRCLE_INTERSECT = tempNodeSource.getFeaturesInExtent(FIRST_COORDS_CIRCLE.getExtent());
        const LAST_COORDS_CIRCLE = new Circle(lastCoords, CIRCLE_RADIUS)
        const LAST_CIRCLE_INTERSECT = tempNodeSource.getFeaturesInExtent(LAST_COORDS_CIRCLE.getExtent());

        let dist = 15;

        let first, last;

        FIRST_CIRCLE_INTERSECT.forEach(function(v) {
            let compareDist = olSphere.getDistance(firstCoords, v.getGeometry().getCoordinates())
            if (compareDist < dist) {
                first = v;
                dist = compareDist;
            }
        })

        dist = 15;

        LAST_CIRCLE_INTERSECT.forEach(function(v) {
            let compareDist = olSphere.getDistance(lastCoords, v.getGeometry().getCoordinates())
            if (compareDist < dist) {
                last = v;
                dist = compareDist;
            }
        })

         ////////////////

        let FROM_NODE_PROPS, TO_NODE_PROPS;

        // if (intersectFromNode.length > 0 && intersectToNode.length > 0) { // 기노드 간 연결
        //     console.log('기존재 노드 간 연결')
        //     FROM_NODE_PROPS = intersectFromNode[0].getProperties();
        //     TO_NODE_PROPS = intersectToNode[0].getProperties();
        //
        //     console.log(FROM_NODE_PROPS);
        //     console.log(TO_NODE_PROPS);
        // } else if (intersectFromNode.length > 0 || intersectToNode.length > 0) {
        //     console.log('하나만 기존재 노드');
        //
        //     const NODE_DATA_REPO_TEMPLATE = {
        //         DATA_TYPE: intersectToNode.length > 0 ? 'FROM' : 'TO',
        //         NODE_ID: intersectToNode.length > 0 ? "CFN" + makeTimeKey() : "CTN" + makeTimeKey(),
        //         NODE_TYPE: '',
        //         NODE_NAME: '',
        //         TRAFFIC_LIGHT: '',
        //         DISTRICT_ID: '',
        //         DISTRICT_ID2: ''
        //     }
        //
        //     FROM_NODE_PROPS = intersectFromNode.length > 0 ? intersectFromNode[0].getProperties() : NODE_DATA_REPO_TEMPLATE;
        //     TO_NODE_PROPS = intersectToNode.length > 0 ? intersectToNode[0].getProperties() : NODE_DATA_REPO_TEMPLATE;
        //
        //     console.log(FROM_NODE_PROPS);
        //     console.log(TO_NODE_PROPS);
        // } else {
        //     console.log('둘 다 신규노드')
        //
        //     FROM_NODE_PROPS = {
        //         DATA_TYPE: 'FROM',
        //         NODE_ID: "CFN" + makeTimeKey(),
        //         NODE_TYPE: '',
        //         NODE_NAME: '',
        //         TRAFFIC_LIGHT: '',
        //         DISTRICT_ID: '',
        //         DISTRICT_ID2: ''
        //     }
        //
        //     TO_NODE_PROPS = {
        //         DATA_TYPE: 'TO',
        //         NODE_ID: "CTN" + makeTimeKey(),
        //         NODE_TYPE: '',
        //         NODE_NAME: '',
        //         TRAFFIC_LIGHT: '',
        //         DISTRICT_ID: '',
        //         DISTRICT_ID2: ''
        //     }
        //
        //     console.log(FROM_NODE_PROPS);
        //     console.log(TO_NODE_PROPS);
        // }

        if (first && last) { // 기노드 간 연결
            console.log('기존재 노드 간 연결')
            FROM_NODE_PROPS = first.getProperties();
            TO_NODE_PROPS = last.getProperties();

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        } else if (first || last) {
            console.log('하나만 기존재 노드');

            let target;
            if (first) {
                target = first.getGeometry();
            } else {
                target = last.getGeometry();
            }

            const NODE_DATA_REPO_TEMPLATE = {
                DATA_TYPE: first ? 'FROM' : 'TO',
                NODE_ID: last ? "CFN" + makeTimeKey() + SESSION_SUFFIX : "CTN" + makeTimeKey() + SESSION_SUFFIX,
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: '',
                EDIT_YN: '',
                WKT: wktFormat.writeGeometry(target).replace("(", " (").replace(",",", ")
            }

            FROM_NODE_PROPS = first ? first.getProperties() : NODE_DATA_REPO_TEMPLATE;
            TO_NODE_PROPS = last ? last.getProperties() : NODE_DATA_REPO_TEMPLATE;

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        } else {
            console.log('둘 다 신규노드')

            FROM_NODE_PROPS = {
                DATA_TYPE: 'FROM',
                NODE_ID: "CFN" + makeTimeKey() + SESSION_SUFFIX,
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: '',
                EDIT_YN: '',
                WKT: wktFormat.writeGeometry(new Point(drawFeature.getGeometry().getFirstCoordinate())).replace("(", " (").replace(",",", ")
            }

            TO_NODE_PROPS = {
                DATA_TYPE: 'TO',
                NODE_ID: "CTN" + makeTimeKey() + SESSION_SUFFIX,
                NODE_TYPE: '',
                NODE_NAME: '',
                TRAFFIC_LIGHT: '',
                DISTRICT_ID: '',
                DISTRICT_ID2: '',
                EDIT_YN: '',
                WKT: wktFormat.writeGeometry(new Point(drawFeature.getGeometry().getLastCoordinate())).replace("(", " (").replace(",",", ")
            }

            console.log(FROM_NODE_PROPS);
            console.log(TO_NODE_PROPS);
        }

        drawFeature.set("UP_FROM_NODE", FROM_NODE_PROPS.NODE_ID);
        drawFeature.set("UP_TO_NODE", TO_NODE_PROPS.NODE_ID);
        drawFeature.set("DOWN_FROM_NODE", TO_NODE_PROPS.NODE_ID);
        drawFeature.set("DOWN_TO_NODE", FROM_NODE_PROPS.NODE_ID);

        drawFeature.set("FROM_NODE_DATA_REPO", FROM_NODE_PROPS);
        drawFeature.set("TO_NODE_DATA_REPO", TO_NODE_PROPS);
        const { FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO } = JSON.parse(JSON.stringify(drawFeature.getProperties()));
        LINK_DATA_REPO.FROM_NODE_DATA_REPO = FROM_NODE_PROPS;
        LINK_DATA_REPO.TO_NODE_DATA_REPO = TO_NODE_PROPS;
        drawFeature.set("LINK_DATA_REPO", LINK_DATA_REPO);

        console.log(drawFeature.getProperties());
        console.log(drawFeature.getId());

        select.getFeatures().push(drawFeature);
        setGridData(drawFeature);
    })

    map.addInteraction(draw);
}

function addFacDrawInteraction() {
    facDraw = new Draw({
        source: facilitySource,
        condition: function(e) {
            // when the point's button is 1(leftclick), allows drawing
              if (e.originalEvent.buttons === 1) {
                return true;
              } else {
                return false;
              }
        },
        type: "Point"
    });

    facDraw.on('drawstart', function(e) {
        e.feature.setStyle(facStyleFunc);
        facSelect.getFeatures().clear();
    })

    facDraw.on('drawend', function(e) {

        const drawFacFeature = e.feature;

        const wktFormat = new WKT();

        drawFacFeature.setProperties({
            'featureType': 'FACILITY',
            'FAC_ID': "CF" + makeTimeKey() + SESSION_SUFFIX,
            'FAC_TY': '',
            'WKT': wktFormat.writeGeometry(drawFacFeature.getGeometry()).replace("(", " (").replace(",",", "),
            'USE_YN': 'Y'
        })
        drawFacFeature.setId(drawFacFeature.get("FAC_ID"));

        facSelect.getFeatures().push(drawFacFeature);
        setGridData(drawFacFeature, 'fac');

    })

    map.addInteraction(facDraw);
}

function addSplitInteraction() {
    split = new Split({
        sources: source
    });

    split.on('beforesplit', function (e) {
        console.log('beforesplit');
        const origin = e.original;
        DELETE_FEATURES_ID.push(origin.get("LINK_ID"));
    })

    split.on('aftersplit', function (e, a, b) {
        console.log('aftersplit');
        const wktFormat = new WKT();
        const firstLink = e.features[0];
        const secondLink = e.features[1];
        const splitNode = new Point(firstLink.getGeometry().getLastCoordinate());

        const splitNodeKey = "SN" + makeTimeKey() + SESSION_SUFFIX;
        let firstLinkLinkDataRepo = JSON.parse(JSON.stringify(firstLink.get("LINK_DATA_REPO")));
        let secondLinkLinkDataRepo = JSON.parse(JSON.stringify(secondLink.get("LINK_DATA_REPO")));

        const originLinkId = e.original.get("LINK_ID");

        firstLink.set("UP_TO_NODE", splitNodeKey);
        firstLink.set("DOWN_FROM_NODE", splitNodeKey);
        firstLink.set("WKT", wktFormat.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", "))
        firstLinkLinkDataRepo.WKT = wktFormat.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", ");

        firstLinkLinkDataRepo.TO_NODE_DATA_REPO = {
            NODE_ID: splitNodeKey,
            NODE_TYPE: '',
            NODE_NAME: '',
            TRAFFIC_LIGHT: '',
            DISTRICT_ID: '',
            DISTRICT_ID2: '',
            EDIT_YN: '',
            WKT: wktFormat.writeGeometry(splitNode).replace("(", " (").replace(",",", ")
        }

        firstLinkLinkDataRepo.UP_TO_NODE = splitNodeKey;
        firstLinkLinkDataRepo.DOWN_FROM_NODE = splitNodeKey;

        let newLinkIdPrefix;

        if (originLinkId.indexOf("_") > -1) {
            newLinkIdPrefix = originLinkId
        } else {
            newLinkIdPrefix = originLinkId + "_"
        }

        // let firstLinkKey = firstLink.get("UP_FROM_NODE") + "_" + firstLink.get("UP_TO_NODE");
        let firstLinkKey = newLinkIdPrefix + "01";

        firstLink.set("LINK_ID", firstLinkKey);
        firstLink.setId(firstLink.get("LINK_ID"));
        firstLinkLinkDataRepo.LINK_ID = firstLinkKey;

        firstLink.set("LINK_DATA_REPO", firstLinkLinkDataRepo);

        secondLink.set("UP_FROM_NODE", splitNodeKey);
        secondLink.set("DOWN_TO_NODE", splitNodeKey);
        secondLink.set("WKT", wktFormat.writeGeometry(secondLink.getGeometry()).replace("(", " (").replace(",",", "))
        secondLinkLinkDataRepo.WKT = wktFormat.writeGeometry(firstLink.getGeometry()).replace("(", " (").replace(",",", ");

        secondLinkLinkDataRepo.FROM_NODE_DATA_REPO = {
            NODE_ID: splitNodeKey,
            NODE_TYPE: '',
            NODE_NAME: '',
            TRAFFIC_LIGHT: '',
            DISTRICT_ID: '',
            DISTRICT_ID2: '',
            EDIT_YN: '',
            WKT: wktFormat.writeGeometry(splitNode).replace("(", " (").replace(",",", ")
        }

        secondLinkLinkDataRepo.UP_FROM_NODE = splitNodeKey;
        secondLinkLinkDataRepo.DOWN_TO_NODE = splitNodeKey;

        // let secondLinkKey = secondLink.get("UP_FROM_NODE") + "_" + secondLink.get("UP_TO_NODE");
        let secondLinkKey = newLinkIdPrefix + "02";

        secondLink.set("LINK_ID", secondLinkKey);
        secondLink.setId(secondLink.get("LINK_ID"));
        secondLinkLinkDataRepo.LINK_ID = secondLinkKey;

        secondLink.set("LINK_DATA_REPO", secondLinkLinkDataRepo);

        console.log('first link');
        console.log(firstLink.getProperties());

        console.log('second link');
        console.log(secondLink.getProperties());

        const splittedLink = [firstLink, secondLink]
        select.getFeatures().extend(splittedLink);
        setGridData(firstLink);
    })

    map.addInteraction(split)
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
            _feature.set("commnt", d.commnt);
            smSource.addFeature(_feature);
        }


      })
      .catch((e) => {
          console.log(e)
      })
}

function getSingleLink(_featureId) {
    console.log(_featureId);

    axios.post(`${common.API_PATH}/api/singleLink`, {
        featureId: _featureId
    })
        .then(({data}) => {
            if (data) {
                const format = new WKT();
                let _feature = format.readFeature(data.wkt, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:4326'
                });

                let centerCoords;
                centerCoords = _feature.getGeometry().getCoordinateAt(0.5);

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

// 22.07.08 장혜진 : 조회기능 추가 = 노드
function getSingleNode(_featureId) {
    console.log(_featureId);

    axios.post( `${common.API_PATH}/api/singleNode`, {
        featureId: _featureId
    })
        .then(({data}) => {
            if (data) {
                const [XCRD, YCRD] = [data.st_x, data.st_y];

                map.getView().setZoom(17);
                map.getView().setCenter([XCRD, YCRD]);
            } else {
                alert('데이터가 없습니다.');
            }
        })
        .catch((e) => {
            alert('데이터가 없거나 오류가 발생했습니다.');
        })
}

// 22.07.08 장혜진 : 조회기능 추가 = 좌표
function getSingleXy(_featureId) {
    const valX = _featureId.substring(0, _featureId.indexOf(','));
    const valY = _featureId.substring(_featureId.lastIndexOf(',') + 1);

    const [XCRD, YCRD] = [valY, valX];

    map.getView().setZoom(19);
    map.getView().setCenter([XCRD, YCRD]);
}

function getFeaturesByZone(_displayZoneWKT) {
  axios.post(`${common.API_PATH}/api/linkByZoneWithNodeData`, {
    wkt: _displayZoneWKT,
    sggCode: getCheckValue()
  })
  .then(({ data }) => {

    LINK_DATA = data.LINK_DATA;
    NODE_DATA = data.NODE_DATA;
    FACILITY_DATA = data.FACILITY_DATA;

    makeLinkFeatures(LINK_DATA);
    makeFacFeatures(FACILITY_DATA);

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
      'ROAD_RANK': d.road_rank || '101',
      'FACILITY_KIND': d.facility_kind || '0',
      'NAVI_LV' : d.navi_lv || '',
      'KOTI_LV' : d.koti_lv || '',
      'LEN' : d.len || '',
      'ST_DIR' : d.st_dir || '',
      'ED_DIR' : d.ed_dir || '',
      'LINK_CATEGORY' : d.link_category || '',
      'ONEWAY' : d.oneway || '',
      'WDTH' : d.wdth || '',
      'LANES' : d.lanes || '',
      'TOLL_NAME' : d.toll_name || '',
      'ROAD_FACILITY_NAME' : d.road_facility_name || '',
      'ROAD_NO' : d.road_no || '',
      'HOV_BUSLANE' : d.hov_buslane || '',
      'SHOV_BUSLANE' : d.shov_buslane || '',
      'AUTOEXCUSIVE' : d.autoexcusive || '',
      'NUM_CROSS' : d.num_cross || '',
      'BARRIER' : d.barrier || '',
      'MAXSPEED' : d.maxspeed || '-1',
      'TL_DENSITY' : d.tl_density || '',
      'TRAF_ID_P' : d.traf_id_p || '',
      'TRAF_ID_N' : d.traf_id_n || '',
      'WKT': d.wkt
    })
    if (NODE_DATA) {
        setNodeData(_feature)
    }
    source.addFeature(_feature);
    _feature.setStyle(styleFunction)
  }

}

function makeFacFeatures(_data) {

    const dataLength = _data.length;
    const format = new WKT();

    for (let i=0; i<dataLength; i++) {
        const d = _data[i];
        if (d.use_yn !== SHOW_USE_YN) {
          let removeTarget = facilitySource.getFeatureById(d.fac_id);
          if (removeTarget) {
            facilitySource.removeFeature(removeTarget)
          }
          continue;
        };
        let _feature = format.readFeature(d.wkt,  {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:4326'
        });
        _feature.setId(d.fac_id);
        _feature.setProperties({
          'featureType': 'FACILITY',
          'FAC_ID': d.fac_id,
          'FAC_TY': d.fac_ty,
          'USE_YN': d.use_yn,
          'WKT': d.wkt
        })
        facilitySource.addFeature(_feature);
        _feature.setStyle(facStyleFunc)
    }

}

function makeNodeFeatures(_data) {

    const dataLength = _data.length;

    const format = new WKT();

    for (let i=0; i<dataLength; i++) {
        const d = _data[i];
        let removeTarget = source.getFeatureById(d.node_id);
        if (removeTarget) {
          source.removeFeature(removeTarget)
            continue;
        }

      let _feature = format.readFeature(d.wkt,  {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:4326'
      });
      _feature.setId(d.node_id);
      _feature.setProperties({
        'featureType': 'NODE',
        'NODE_ID': d.node_id,
        'WKT': d.wkt
      })
      source.addFeature(_feature);
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
      editor: {
          type: CustomTextEditor,
          options: {
              maxLength: 10
          }
      }
    }
  ];

  LINK_GRID_INSTANCE.on('editingStart', (ev) => {
      const rowInfo = LINK_GRID_INSTANCE.getRowAt(ev.rowKey);
      if (rowInfo.name === "ROAD_RANK" || rowInfo.name === "FACILITY_KIND") {
          ev.stop();
      } else {

      }
  })

  LINK_GRID_INSTANCE.on('afterChange', (ev) => {
      const changes = ev.changes[0];
      const rowInfo = LINK_GRID_INSTANCE.getRowAt(changes.rowKey);
      const changeColumnName = rowInfo.name;
      const changeValue = rowInfo.value;
      const LINK_GRID_DATA = LINK_GRID_INSTANCE.getData();
      const LINK_ID = LINK_GRID_DATA.find(v => v.name === "LINK_ID").value;
      const feature = source.getFeatureById(LINK_ID);
      const featureRepo = feature.get("LINK_DATA_REPO");
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

function setDisabledColumn() {

    const LINK_COLUMNS = LINK_GRID_INSTANCE.getData();

    const LINK_DISABLED_COLUMS = [
        'road_rank', 'facility_kind', 'navi_lv', 'koti_lv', 'len', 'st_dir', 'ed_dir', 'link_category', 'oneway'
        , 'wdth,lanes', 'toll_name', 'road_facility_name', 'road_no', 'hov_buslane', 'shov_buslane', 'autoexcusive'
        , 'num_cross', 'barrier', 'maxspeed', 'tl_density', 'traf_id_p', 'traf_id_n', 'wdth', 'lanes'
    ].map(v => v.toUpperCase());

    LINK_COLUMNS.forEach(({ rowKey, name }) => {

        if (LINK_DISABLED_COLUMS.includes(name)) {
            LINK_GRID_INSTANCE.disableRow(rowKey)
        }


    })


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
              NODE_TYPE: FROM_NODE_PROPS.node_type || '',
              NODE_NAME: FROM_NODE_PROPS.node_name || '',
              TRAFFIC_LIGHT: FROM_NODE_PROPS.traffic_light || '',
              DISTRICT_ID: FROM_NODE_PROPS.district_id || '',
              DISTRICT_ID2: FROM_NODE_PROPS.district_id2 || '',
              EDIT_YN: FROM_NODE_PROPS.edit_yn || '',
              WKT: FROM_NODE_PROPS.wkt
        }
        LINK_PROPS.FROM_NODE_DATA_REPO = FROM_NODE_PROPS_FORM;
    }

    if (TO_NODE_PROPS) {
        const TO_NODE_PROPS_FORM = {
              NODE_ID: TO_NODE_PROPS.node_id,
              NODE_TYPE: TO_NODE_PROPS.node_type || '',
              NODE_NAME: TO_NODE_PROPS.node_name || '',
              TRAFFIC_LIGHT: TO_NODE_PROPS.traffic_light || '',
              DISTRICT_ID: TO_NODE_PROPS.district_id || '',
              DISTRICT_ID2: TO_NODE_PROPS.district_id2 || '',
              EDIT_YN: TO_NODE_PROPS.edit_yn || '',
              WKT: TO_NODE_PROPS.wkt
        }
        LINK_PROPS.TO_NODE_DATA_REPO = TO_NODE_PROPS_FORM;
    }

    target.set("LINK_DATA_REPO", LINK_PROPS);
}

function pushSaveData(target, flag) {
    if (!flag) {

        setTimeout(() => {

            saveDataArchive.push(target.getId());
            saveDataArchive = Array.from(new Set(saveDataArchive));
            saveDataArchive = saveDataArchive.filter(v => {
                return source.getFeatureById(v) !== null;
            })


        }, 10)

    } else {

        setTimeout(() => {

            facSaveDataArchive.push(target.getId());
            facSaveDataArchive = Array.from(new Set(facSaveDataArchive));
            facSaveDataArchive = facSaveDataArchive.filter(v => {
                return facilitySource.getFeatureById(v) !== null;
            })


        }, 10)

    }
}

function setGridData(target, flag) {

    if (flag) {

        const targetProps = JSON.parse(JSON.stringify(target.getProperties()));

        const FAC_GRID_DATA = getGridData(targetProps);
        FAC_GRID_INSTANCE.resetData(FAC_GRID_DATA);

    } else {
        const {FROM_NODE_DATA_REPO, TO_NODE_DATA_REPO, ...LINK_DATA_REPO} = JSON.parse(JSON.stringify(target.get("LINK_DATA_REPO")));

        const LINK_GRID_DATA = getGridData(LINK_DATA_REPO, 'LINK')
        LINK_GRID_INSTANCE.resetData(LINK_GRID_DATA);

        const FROM_NODE_GRID_DATA = getGridData(FROM_NODE_DATA_REPO, 'FROM_NODE');
        FROM_NODE_GRID_INSTANCE.resetData(FROM_NODE_GRID_DATA);
        const TO_NODE_GRID_DATA = getGridData(TO_NODE_DATA_REPO, 'TO_NODE');
        TO_NODE_GRID_INSTANCE.resetData(TO_NODE_GRID_DATA);

        GRID_SET_LINK_ID = target.get("LINK_ID");

        setDisabledColumn();
    }


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

function applyData(flag) {

    wktUpdate();

    const urlPrefix = `${common.API_PATH}/api`;

    let DATA_REPO;

    if (!flag) {
        DATA_REPO = saveDataArchive.map(v => {
            const findFeature = source.getFeatureById(v);
            const findFeaturesProps = findFeature.getProperties();
            return findFeaturesProps;
        })
    } else {
        DATA_REPO = facSaveDataArchive.map(v => {
            const findFeature = facilitySource.getFeatureById(v);
            const findFeaturesProps = findFeature.getProperties();
            return findFeaturesProps;
        })
    }

    let POST_URL;

    if (flag) {
        POST_URL = `${urlPrefix}/saveData/fac`
    }  else {
        POST_URL = `${urlPrefix}/saveData`
    }

    console.log(DATA_REPO);

    sessionCheck();

    axios.post(POST_URL, DATA_REPO)
    .then(({ data }) => {

        if (DELETE_FEATURES_ID.length > 0) {
            DELETE_FEATURES_ID.forEach(v => deleteData(v, "LINK"));
        }

        if (data) {
            clearing();
            alert('저장되었습니다.');
            saveDataArchive = [];
            facSaveDataArchive = [];
        }

    })
    .catch(function (error) {
        console.log(error);
    });
}

// 22.07.14 장혜진 : wkt 미저장으로 인한 처리
function updateWktfGeom(_featureId) {

    buttonStyleToggle(document.getElementById('CREATE-BTN'));

    const isOn = document.getElementById('CREATE-BTN').classList.contains('btn-primary');

    allInteractionOff()
    clearing();

    if (isOn) {
        addModifyInteraction();
        addDrawInteraction();
        addSnapInteraction();
        document.getElementById('main-grid-zone').style.display = 'block';
        document.getElementById('fac-grid-zone').style.display = 'none';
    }
    // axios.put(`${common.API_PATH}/api/updateWktfGeom`, {
    //     featureId: _featureId
    // })
    // .then(({ data }) => {
    //     alert("생성에 필요한 데이터를 구성 작업에 성공하였습니다.");
    //
    //     buttonStyleToggle(document.getElementById('CREATE-BTN'));
    //
    //     const isOn = document.getElementById('CREATE-BTN').classList.contains('btn-primary');
    //
    //     allInteractionOff()
    //     clearing();
    //
    //     if (isOn) {
    //         addModifyInteraction();
    //         addDrawInteraction();
    //         addSnapInteraction();
    //         document.getElementById('main-grid-zone').style.display = 'block';
    //         document.getElementById('fac-grid-zone').style.display = 'none';
    //     }
    // })
    // .catch(function (error) {
    //     alert("생성에 필요한 데이터를 구성 작업에 실패하였습니다. \n관리자에게 문의하시길 바랍니다.");
    // });
}

function deleteData(_id, _dataType) {
  axios.post(`${common.API_PATH}/api/deleteData`, {
      id: _id,
      dataType: _dataType
    })
    .then(({ data }) => {

      if (data) {
        clearing();
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

    const isFacMode = document.getElementById('FAC-MNG-BTN').classList.contains('btn-primary');

    if (!isFacMode) {
        return select ? select.getFeatures().getArray().map(v => v.getId()) : [];
    } else {
        return facSelect ? facSelect.getFeatures().getArray().map(v => v.getId()) : [];
    }


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

    tempNodeSource.clear();
    facilitySource.clear();
    source.clear();

    displayZoneFeature = null;
    DELETE_FEATURES_ID = [];

    if (getZoomLevel() > 16) {
        let nowDisplayExtent = getExtent();
        let displayZonePolygon = fromExtent(nowDisplayExtent);
        displayZoneFeature = new Feature({
            geometry: displayZonePolygon
        })
    }

    if (getCheckValue().length === 0) {
        if (getZoomLevel() > 16) {
            getFeaturesByZone(wkt);
        }
    } else {
        getFeaturesByZone('');
    }

    select.getFeatures().clear();
    GRID_SET_LINK_ID = null;

    source.refresh();
}

function getCheckValue() {
    const chkList = document.querySelectorAll("input[name=sgg]:checked");
    const checkedValueArray = [];
    chkList.forEach(function (ch) {
        checkedValueArray.push(ch.value);
    });

    return checkedValueArray;
}

function wktUpdate(flag) {
    const selectedFeatures = flag ? facSelect.getFeatures() : select.getFeatures();

    selectedFeatures.forEach(function(_f) {
        if (!flag) {
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
        } else {
            const wkt = new WKT();
            _f.set("WKT", wkt.writeGeometry(new Point(_f.getGeometry().getCoordinates())).replace("(", " (").replace(",",", "))
        }
    })

}

function allInteractionOff() {
    map.removeInteraction(draw);
    map.removeInteraction(modify);

    map.removeInteraction(facDraw);
    map.removeInteraction(facModify);
    map.removeInteraction(facSnap);
}

function buttonStyleToggle(_dom) {
    const isOn = _dom.classList.contains('btn-primary');

    const allBtn = document.getElementsByClassName('control-btn');
    for (let i=0; i<allBtn.length; i++) {
        if (allBtn[i].id === 'ROADVIEW-BTN') continue;
        allBtn[i].classList.replace('btn-primary', 'btn-secondary');
    }

    if (isOn) {
        _dom.classList.replace('btn-primary', 'btn-secondary');
    } else {
        _dom.classList.replace('btn-secondary', 'btn-primary');
    }
}

function roadViewToggle() {
    let isShow = false;
    return function() {
        let rvBtn = document.getElementById('ROADVIEW-BTN');
        const isOn = rvBtn.classList.contains('btn-warning');

        if (isOn) {
            rvBtn.classList.replace('btn-warning', 'btn-secondary');
        } else {
            rvBtn.classList.replace('btn-secondary', 'btn-warning');
        }

        let innerMap = document.getElementById('innerMap-zone');
        isShow = !isShow;

        innerMap.style.display = isShow ? 'block' : 'none';
    }
}

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
function setSession() {
    axios.post(`${common.API_PATH}/setSession`)
    .then(({ data }) => {
        console.log(data);
        SESSION_UID = data.UUID;
        SESSION_SUFFIX = data.SESSION_SUFFIX;
    })
    .catch(function (error) {
        console.log(error);
    });
}

function expireSession() {
    axios.post(`${common.API_PATH}/expireSession`, {
        sessionUid: SESSION_UID
    })
    .then(({ data }) => {
        // console.log(data);
    })
    .catch(function (error) {
        console.log(error);
    });
}

function sessionCheck() {
    axios.post(`${common.API_PATH}/sessionCheck`, {
        sessionUid: SESSION_UID
    })
    .then(({ data }) => {

        if (data === "ACTIVE") {

        } else if (data === "EXPIRED") {

            SESSION_UID = null;
            SESSION_SUFFIX = null;

            location.reload();
        }
    })
    .catch(function (error) {
        console.log(error);
    });
}

function copyToClipboard(val) {
  const t = document.createElement("textarea");
  document.body.appendChild(t);
  t.value = val;
  t.select();
  document.execCommand('copy');
  document.body.removeChild(t);
}
