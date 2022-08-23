/* start of all page shared script */
import { View } from 'ol';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';

let z,y,x;

export const API_PATH = import.meta.env.VITE_API_PATH;

export const _baseMapSource = () => {
    let xyzSource = new XYZ ({
      tileUrlFunction: function(coordinate) {
      z = coordinate[0];
      y = coordinate[2];
      x = coordinate[1];

      return `http://api.vworld.kr/req/wmts/1.0.0/17EE75BB-2823-33C2-A46A-CBB25E73D1BA/Satellite/${z}/${y}/${x}.jpeg`
    }
  })

  xyzSource.on('tileloaderror', function(e) {
    // console.log(e);
  })

  return xyzSource
}

export const _baseMapInfoSource = new XYZ({
  url: 'http://api.vworld.kr/req/wmts/1.0.0/17EE75BB-2823-33C2-A46A-CBB25E73D1BA/Hybrid/{z}/{y}/{x}.png'
})

export const _baseMapLayer = new TileLayer({
  title: '위성지도',
  source: _baseMapSource(),
  crossOrigin: 'Anonymous',
  name: "BaseMap"
})

export const _baseMapInfoLayer = new TileLayer({
  title: '정보',
  source: _baseMapInfoSource,
  crossOrigin: 'Anonymous',
  name: "BaseMap"
})

export let _centerCoords = [126.70, 37.50];

export let _mainMapView = new View({
  projection: 'EPSG:4326',
  center: _centerCoords,
  zoom: 12,
  minZoom: 0,
  maxZoom: 25,
})
