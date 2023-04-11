// import './style.css';
// import { Map, View, Feature } from 'ol';
// import { Point } from 'ol/geom';
// import { Cluster, OSM, Vector as VectorSource } from 'ol/source.js';
// import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
// import {
//   Circle as CircleStyle,
//   Fill,
//   Icon,
//   Stroke,
//   Style,
//   Text,
// } from 'ol/style.js';
// import { boundingExtent } from 'ol/extent.js';
// import Overlay from 'ol/Overlay.js';
// import { toStringHDMS } from 'ol/coordinate.js';
// import { fromLonLat, toLonLat } from 'ol/proj.js';

(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.governanceMap = {
    attach: function (context, settings) {
      $('.governance-map', context).once('governanceMap').each(function () {
        var clusterUids = [];
        var clusterPaths = [];

        var categories = settings.parc_governance_map.institution_types;
        bootstrap.Tooltip.Default.allowList['*'].push('style');

        var map_id = $(this).data('map-id');
        var institutions = settings.parc_governance_map[map_id].institutions;
        console.log(institutions);

        const count = 100;
        const features = new Array(institutions.length);
        const e = 450000;
        for (i = 0; i < institutions.length; i++) {
          // const coordinates = [2 * e * Math.random() * 5 - e, 2 * e * Math.random() * 5 - e];
          const coordinates = [institutions[i].lat * 100000, institutions[i].long * 100000];
          features[i] = new ol.Feature(new ol.geom.Point(coordinates));

          // add custom features
          features[i].setProperties(
            {
              'countryId': randomIntFromInterval(1, 10),
              'categoryId': randomIntFromInterval(1, 4),
              'name': institutions[i].title,
            }
          );
        }

// test feature
//         let myFeature = new ol.Feature(new ol.geom.Point([2905711.9990543374, 5531730.721795394]));
//         myFeature.setProperties(
//           {
//             'countryId': randomIntFromInterval(1, 10),
//             'categoryId': randomIntFromInterval(1, 8),
//             'name': 'Feature 100'
//           }
//         );
//         features[100] = myFeature;
//

        const source = new ol.source.Vector({
          features: features,
        });

        const clusterSource = new ol.source.Cluster({
          distance: 70,
          minDistance: 50,
          source: source,
        });

        clusterSource.on('clear', function (evt) {
          clusterUids = [];
          clusterPaths = [];
          // console.log('clear');
        })

//const styleCache = {};
        const clusters = new ol.layer.Vector({
          source: clusterSource,
          style: function (feature) {
            const size = feature.get('features').length;
            let found = clusterUids.find(el => el.id === feature.ol_uid);
            if (!found) {
              clusterUids.push({ id: feature.ol_uid, size: size });
            }

            //let style = styleCache[size];
            //if (!style) {
            var canvas = getClusterImage(feature.get('features'), feature.ol_uid);
            var image = new Image();
            image.src = canvas.toDataURL("image/png");

            let anchor = [];
            let offsetY = 0;

            if (feature.get('features').length === 1) {
              anchor = [canvas.width / 2, canvas.height];
              offsetY = -28;
            } else {
              anchor = [canvas.width / 2, canvas.height / 2];
            }

            let style = new ol.style.Style({
              image: new ol.style.Icon({
                img: image,
                imgSize: [canvas.width, canvas.height],
                anchor: anchor,
                anchorXUnits: "pixels",
                anchorYUnits: "pixels",
              }),
              text: new ol.style.Text({
                text: /*feature.ol_uid.toString(),//*/size.toString(),
                fill: new ol.style.Fill({
                  color: '#000',
                }),
                font: '15px sans-serif',
                offsetY: offsetY,
                // backgroundFill: new ol.style.Fill({
                //   color: '#fff',
                // })
              }),
            });
            //styleCache[size] = style;
            //}
            return style;
          },
        });

        const raster = new ol.layer.Tile({
          source: new ol.source.OSM(),
        });

        const map = new ol.Map({
          target: $(this).attr('id'),
          layers: [
            raster, clusters
          ],
          view: new ol.View({
            center: [0, 0],
            zoom: 2
          })
        });

        const popup = new ol.Overlay({
          element: document.getElementById('popup'),
        });
        map.addOverlay(popup);
        const element = popup.getElement();
        let popover = bootstrap.Popover.getInstance(element);

        map.on('pointermove', (e) => {
          clusters.getFeatures(e.pixel).then((clickedFeatures) => {
            popup.setPosition(0, 0);

            if (clickedFeatures.length) {
              let hoverCluster = clickedFeatures[0];

              const features = clickedFeatures[0].get('features');
              if (features.length === 1) {
                const coordinate = e.coordinate;
                popup.setPosition(coordinate);

                if (popover) {
                  popover.dispose();
                }
                popover = new bootstrap.Popover(element, {
                  animation: false,
                  container: element,
                  content: `<p><span class="identify-rectangle-span" style="background-color: ${getColorByCategoryId(features[0].get('categoryId'))}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span>${features[0].get('name')}</span></p>`,
                  html: true,
                  placement: 'top',
                  title: 'Selected feature(s)',
                });
                popover.show();
              } else {

                // console.log(hoverCluster);

                var geometry = hoverCluster.getGeometry().getCoordinates();
                var pixelCoords = map.getPixelFromCoordinate(geometry);
                //console.log('center pixel coords: ', pixelCoords);
                //console.log('mouse position in general pixel: ', e.pixel);

                let marginLeft = pixelCoords[0] - 29;
                let marginTop = pixelCoords[1] - 29;
                let relativeX = e.pixel[0] - marginLeft;
                let relativeY = e.pixel[1] - marginTop;

                //console.log('mouse position in pixel relative to canvas: ', relativeX, relativeY);

                // console.log(clusterPaths);
                let cluster = clusterPaths.find(el => el.id === hoverCluster.ol_uid);
                if (cluster) {
                  //console.log(cluster);
                  let isSingle = false;
                  cluster.paths.forEach(path => {
                    // console.log(path);
                    if (cluster.ctx.isPointInStroke(path.path, relativeX, relativeY)) {
                      // console.log("Selected: ", path.name);
                      isSingle = true;

                      const coordinate = e.coordinate;
                      popup.setPosition(coordinate);

                      if (popover) {
                        popover.dispose();
                      }
                      popover = new bootstrap.Popover(element, {
                        animation: false,
                        container: element,
                        content: `<p><span class="identify-rectangle-span" style="background-color: ${getColorByCategoryId(path.categoryId)}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span>${path.name}</span></p>`,
                        html: true,
                        placement: 'top',
                        title: 'Selected feature(s)',
                      });
                      popover.show();
                      //console.log(cluster.ctx);
                      //cluster.ctx.clearRect(0,0,58,58);
                      //cluster.ctx.rect(0, 0, 58, 58);
                      //cluster.ctx.stroke();
                    }
                  });

                  if (!isSingle) {
                    const coordinate = e.coordinate;
                    popup.setPosition(coordinate);

                    let content = '';
                    cluster.paths.forEach(path => {
                      content += `<p><span class="identify-rectangle-span" style="background-color: ${getColorByCategoryId(path.categoryId)}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span>${path.name}</span></p>`;
                    })
                    if (popover) {
                      popover.dispose();
                    }
                    popover = new bootstrap.Popover(element, {
                      animation: false,
                      container: element,
                      content: content,
                      html: true,
                      placement: 'top',
                      title: 'Selected feature(s)',
                    });
                    popover.show();
                  }

                }
              }
            }
          });
        });

        map.on('click', (e) => {
          const coordinate = e.coordinate;
          const hdms = ol.coordinate.toStringHDMS(ol.proj.toLonLat(coordinate));
          // popup.setPosition(coordinate);
          // let popover = bootstrap.Popover.getInstance(element);
          // if (popover) {
          //   popover.dispose();
          // }
          // popover = new bootstrap.Popover(element, {
          //   animation: false,
          //   container: element,
          //   content: '<p>The location you clicked was:</p><code>' + hdms + '</code>',
          //   html: true,
          //   placement: 'top',
          //   title: 'Welcome to OpenLayers',
          // });
          // popover.show();
          //

          clusters.getFeatures(e.pixel).then((clickedFeatures) => {
            if (clickedFeatures.length) {
              // console.log(clickedFeatures[0]);
              // Get clustered Coordinates
              const features = clickedFeatures[0].get('features');
              // console.log(features.length)
              // if (features.length > 1) {
              //   const extent = boundingExtent(
              //     features.map((r) => r.getGeometry().getCoordinates())
              //   );
              //   map.getView().fit(extent, { duration: 1000, padding: [50, 50, 50, 50] });
              // }
            }
          });
        });

        function randomIntFromInterval(min, max) { // min and max included
          return Math.floor(Math.random() * (max - min + 1) + min)
        }

        function getClusterImage(features, featureId) {
          // console.log('new call');
          let addPath = false;
          // console.log(clusterPaths);
          let foundPath = clusterPaths.find(el => el.id === featureId);
          if (!foundPath) {
            // console.log('aici', featureId);
            clusterPaths.push({ id: featureId, ctx: null, paths: [] })
            foundPath = clusterPaths[clusterPaths.length - 1];
            addPath = true;
          }

          let canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          let delta = 0.2;
          let radiusSingle = 15;
          let radiusEqualCategoryId = 20;
          let radiusCluster = 26;
          let deltaDouble = 0.15;

          // console.log(features.length);
          if (features.length === 1) {
            canvas.setAttribute('width', 2 * radiusSingle + 6);
            canvas.setAttribute('height', 2 * radiusSingle + 16);

            //ctx.rect(0, 0, 2 * radiusSingle + 6, 2 * radiusSingle + 16);
            //ctx.stroke();

            ctx.beginPath();
            ctx.arc(radiusSingle + 3, radiusSingle + 3, radiusSingle, 0, Math.PI * 2);
            ctx.strokeStyle = getColorByCategoryId(features[0].get('categoryId'));
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(radiusSingle + 8, 2 * radiusSingle + 1);
            ctx.lineTo(radiusSingle + 3, 2 * radiusSingle + 10);
            ctx.lineTo(radiusSingle - 2, 2 * radiusSingle + 1);
            ctx.stroke();

          } else {
            let allEqualCategoryId = features.every((val, i, arr) => val.get('categoryId') === arr[0].get('categoryId'));
            if (allEqualCategoryId) {
              canvas.setAttribute('width', 2 * radiusEqualCategoryId + 6);
              canvas.setAttribute('height', 2 * radiusEqualCategoryId + 6);

              // ctx.rect(0, 0, 2 * radiusEqualCategoryId + 6, 2 * radiusEqualCategoryId + 6);
              // ctx.stroke();

              ctx.lineWidth = 5;
              ctx.lineCap = "round";
              let path = new Path2D();
              path.arc(radiusEqualCategoryId + 3, radiusEqualCategoryId + 3, radiusEqualCategoryId, 0, 2 * Math.PI);
              ctx.strokeStyle = getColorByCategoryId(features[0].get('categoryId'));
              ctx.stroke(path);

              //servet todo
              if (addPath) {
                features.forEach(element => {
                  // console.log(element);
                  foundPath.ctx = ctx;
                  foundPath.paths.push({ path: path, categoryId: element.get('categoryId'), name: element.get('name') });
                  // console.log(clusterPaths);
                });
              }

            } else {
              canvas.setAttribute('width', 2 * radiusCluster + 6);
              canvas.setAttribute('height', 2 * radiusCluster + 6);

              // ctx.rect(0, 0, 2 * radiusCluster + 6, 2 * radiusCluster + 6);
              // ctx.stroke();

              let featuresToDraw = [];

              for (let i = 0; i < features.length; i++) {
                let index = featuresToDraw.findIndex(el => el.categoryId === features[i].get('categoryId'));
                if (index > -1) {
                  featuresToDraw[index].children.push(features[i]);
                } else {
                  featuresToDraw.push({
                    categoryId: features[i].get('categoryId'),
                    name: features[i].get('name'),
                    children: [features[i]]
                  });
                }
              }
              let interval = 2 * Math.PI / featuresToDraw.length;

              for (let i = 0; i < featuresToDraw.length; i++) {
                if (featuresToDraw[i].children.length === 1) {

                  ctx.lineWidth = 5;
                  ctx.lineCap = "round";

                  let path = new Path2D();
                  path.arc(radiusCluster + 3, radiusCluster + 3, radiusCluster, i * interval + delta, (i + 1) * interval - delta);
                  ctx.strokeStyle = getColorByCategoryId(featuresToDraw[i].categoryId);
                  ctx.stroke(path);
                  if (addPath) {
                    foundPath.ctx = ctx;
                    foundPath.paths.push({ path: path, categoryId: featuresToDraw[i].categoryId, name: featuresToDraw[i].name });
                  }


                } else if (featuresToDraw[i].children.length === 2) {

                  ctx.lineWidth = 5;
                  ctx.lineCap = "round";

                  var mid = ((i * interval + delta) + ((i + 1) * interval - delta)) / 2;

                  let path1 = new Path2D();
                  path1.arc(radiusCluster + 3, radiusCluster + 3, radiusCluster, i * interval + delta, mid - deltaDouble);
                  ctx.strokeStyle = getColorByCategoryId(featuresToDraw[i].categoryId);
                  ctx.stroke(path1);

                  if (addPath) {
                    foundPath.ctx = ctx;
                    foundPath.paths.push({ path: path1, categoryId: featuresToDraw[i].categoryId, name: featuresToDraw[i].children[0].get('name') });
                  }

                  let path2 = new Path2D();
                  path2.arc(radiusCluster + 3, radiusCluster + 3, radiusCluster, mid + deltaDouble, (i + 1) * interval - delta);
                  ctx.strokeStyle = getColorByCategoryId(featuresToDraw[i].categoryId);
                  ctx.stroke(path2);
                  if (addPath) {
                    foundPath.ctx = ctx;
                    foundPath.paths.push({ path: path2, categoryId: featuresToDraw[i].categoryId, name: featuresToDraw[i].children[1].get('name') });
                  }

                } else if (featuresToDraw[i].children.length > 2) {

                  ctx.lineWidth = 2;
                  ctx.lineCap = "round";

                  var min = i * interval + delta;
                  var max = (i + 1) * interval - delta;
                  var center = radiusCluster + 3;
                  var step = (max - min) / (featuresToDraw[i].children.length - 1);

                  for (let j = 0; j < featuresToDraw[i].children.length; j++) {
                    var x = center + radiusCluster * Math.cos(min + j * step);
                    var y = center + radiusCluster * Math.sin(min + j * step);

                    let path = new Path2D();
                    path.arc(x, y, 2, 0, 2 * Math.PI);
                    ctx.fillStyle = getColorByCategoryId(featuresToDraw[i].categoryId);
                    ctx.strokeStyle = getColorByCategoryId(featuresToDraw[i].categoryId);
                    ctx.fill(path);
                    ctx.stroke(path);

                    if (addPath) {
                      foundPath.ctx = ctx;
                      foundPath.paths.push({ path: path, categoryId: featuresToDraw[i].categoryId, name: featuresToDraw[i].children[j].get('name') });
                    }
                  }
                }
              }
            }
          }
          return canvas;
        }

        function getColorByCategoryId(id) {
          let found = categories.find(el => el.id === id);
          if (found) {
            return found.color;
          } else
            return '#000';
        }
      });
    }
  }
})(jQuery, Drupal, drupalSettings);
