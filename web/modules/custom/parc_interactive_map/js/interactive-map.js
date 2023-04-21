(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.interactiveMap = {
    attach: function (context, settings) {
      $('.interactive-map', context).once('interactiveMap').each(function () {
        var clusterUids = [];
        var clusterPaths = [];

        var categories = settings.parc_interactive_map.categories;
        bootstrap.Tooltip.Default.allowList['*'].push('style');

        var map_id = $(this).data('map-id');
        var institutions = settings.parc_interactive_map[map_id].institutions;
        // TODO: Remove console log
        console.log(institutions);

        const features = new Array(institutions.length);
        for (let i = 0; i < institutions.length; i++) {
          const coordinates = [institutions[i].lat * 100000, institutions[i].long * 100000];
          features[i] = new ol.Feature(new ol.geom.Point(coordinates));

          // add custom features
          features[i].setProperties(
            {
              'countryId': institutions[i].country,
              'categoryId': institutions[i].category,
              'name': institutions[i].title,
              'image': institutions[i].image,
            }
          );
        }

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
        })

        const styleCache = {};
        const clusters = new ol.layer.Vector({
          source: clusterSource,
          style: function (feature) {
            const size = feature.get('features').length;
            let found = clusterUids.find(el => el.id === feature.ol_uid);
            if (!found) {
              clusterUids.push({ id: feature.ol_uid, size: size });
            }

            let style = styleCache[ol.util.getUid(feature)];
            if (!style) {
              getClusterImage(feature.get('features'), feature.ol_uid).then(canvas => {
                var image = new Image();
                image.crossOrigin = "anonymous"
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
                  }),
                });
                styleCache[ol.util.getUid(feature)] = style;
              });
            }
            return style;
          }
        });

        const raster = new ol.layer.Tile({
          source: new ol.source.OSM(),
        });

        // TODO: replace API key when received from client - this is a test API key created by EAU DE WEB
        const key = 's2nf4NvYtz2XEYAiCGP8';

        const maptilerSrc = new ol.source.TileJSON({
          url: `https://api.maptiler.com/maps/dataviz-light/tiles.json?key=${key}`, // source URL
          tileSize: 512,
          crossOrigin: 'anonymous'
        });
        const maptilerBkg = new ol.layer.Tile({
          source: maptilerSrc,
        });

        const map = new ol.Map({
          target: $(this).attr('id'),
          layers: [
            // raster, clusters
            maptilerBkg, clusters
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

        map.on('moveend', (e) => {
          var output = [];
          document.querySelector('#resultsParent').innerHTML = '';
          if(clusters) {
            let allClusterFeatures = clusters.getSource().getFeatures();
            let mapExtent = map.getView().calculateExtent();

            for (var i = 0; i < allClusterFeatures.length; i++) {
              var feature = allClusterFeatures[i];
              if (ol.extent.containsExtent(mapExtent, feature.getGeometry().getExtent())) {
                let currentFeaturesInCluster = feature.get('features');
                for(let j = 0; j < currentFeaturesInCluster.length; j++) {
                  output.push(currentFeaturesInCluster[j].get('name'));
                  document.querySelector('#resultsParent').innerHTML += `<p><span class="identify-rectangle-span" style="background-color: ${getColorByCategoryId(currentFeaturesInCluster[j].get('categoryId'))}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span>${currentFeaturesInCluster[j].get('name')}</span></p>`;
                }
              }
            }
          }

          document.querySelector('#showResultsButton').innerHTML = output.length + ' results';
        });

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
                var geometry = hoverCluster.getGeometry().getCoordinates();
                var pixelCoords = map.getPixelFromCoordinate(geometry);

                let marginLeft = pixelCoords[0] - 29;
                let marginTop = pixelCoords[1] - 29;
                let relativeX = e.pixel[0] - marginLeft;
                let relativeY = e.pixel[1] - marginTop;

                let cluster = clusterPaths.find(el => el.id === hoverCluster.ol_uid);
                if (cluster) {
                  let isSingle = false;
                  cluster.paths.forEach(path => {
                    if (cluster.ctx.isPointInStroke(path.path, relativeX, relativeY)) {
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
          clusters.getFeatures(e.pixel).then((clickedFeatures) => {
            if (clickedFeatures.length) {
              // Get clustered Coordinates
              const features = clickedFeatures[0].get('features');

              if (features.length > 1) {
                const extent = ol.extent.boundingExtent(
                  features.map((r) => r.getGeometry().getCoordinates())
                );
                map.getView().fit(extent, { duration: 1000, padding: [50, 50, 50, 50] });
                document.getElementById('identifyParent').style.display = 'none';
              } else {
                document.getElementById('identifyParent').style.display = 'block';
                document.querySelector('#selectedFeatureParent').innerHTML = `<p><span class="identify-rectangle-span" style="background-color: ${getColorByCategoryId(features[0].get('categoryId'))}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span>${features[0].get('name')}</span></p>`;
              }
            } else {
              document.getElementById('identifyParent').style.display = 'none';
            }
          });
        });
        function getClusterImage(features, featureId) {
          return new Promise(resolve => {
            let addPath = false;
            let foundPath = clusterPaths.find(el => el.id === featureId);

            if (!foundPath) {
              clusterPaths.push({ id: featureId, ctx: null, paths: [] })
              foundPath = clusterPaths[clusterPaths.length - 1];
              addPath = true;
            }

            let canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            let delta = 0.2;
            let radiusSingle = 15;//25;
            let radiusEqualCategoryId = 20;
            let radiusCluster = 26;
            let deltaDouble = 0.15;

            if (features.length === 1) {
              canvas.setAttribute('width', 2 * radiusSingle + 6);
              canvas.setAttribute('height', 2 * radiusSingle + 16);

              var image = new Image();
              image.crossOrigin = "anonymous"
              image.onload = function () {

                ctx.beginPath();
                ctx.arc(radiusSingle + 3, radiusSingle + 3, radiusSingle, 0, Math.PI * 2);
                ctx.closePath();
                ctx.strokeStyle = getColorByCategoryId(features[0].get('categoryId'));
                ctx.lineWidth = 5;
                ctx.stroke();

                ctx.restore();
                ctx.beginPath();
                ctx.moveTo(radiusSingle + 8, 2 * radiusSingle + 1);
                ctx.lineTo(radiusSingle + 3, 2 * radiusSingle + 10);
                ctx.lineTo(radiusSingle - 2, 2 * radiusSingle + 1);

                ctx.strokeStyle = getColorByCategoryId(features[0].get('categoryId'));
                ctx.lineWidth = 5;
                ctx.stroke();

                resolve(canvas)
              };
              image.src = features[0].get("image");

            } else {
              let allEqualCategoryId = features.every((val, i, arr) => val.get('categoryId') === arr[0].get('categoryId'));
              if (allEqualCategoryId) {
                canvas.setAttribute('width', 2 * radiusEqualCategoryId + 6);
                canvas.setAttribute('height', 2 * radiusEqualCategoryId + 6);

                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                let path = new Path2D();
                path.arc(radiusEqualCategoryId + 3, radiusEqualCategoryId + 3, radiusEqualCategoryId, 0, 2 * Math.PI);
                ctx.strokeStyle = getColorByCategoryId(features[0].get('categoryId'));
                ctx.stroke(path);

                if (addPath) {
                  features.forEach(element => {
                    // TODO: remove console.log
                    // console.log(element);
                    foundPath.ctx = ctx;
                    foundPath.paths.push({ path: path, categoryId: element.get('categoryId'), name: element.get('name') });
                    // console.log(clusterPaths);
                  });
                }

              } else {
                canvas.setAttribute('width', 2 * radiusCluster + 6);
                canvas.setAttribute('height', 2 * radiusCluster + 6);

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
              resolve(canvas);
            }
          });
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
