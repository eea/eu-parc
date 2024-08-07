(function ($, Drupal, drupalSettings, once) {
  Drupal.behaviors.resizeMap = {
    attach: function (context) {
      // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
      let vh = window.innerHeight * 0.01;
      // Then we set the value in the --vh custom property to the root of the document
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      // We listen to the resize event
      window.addEventListener('resize', () => {
        // We execute the same script as before
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      });
    }
  }

  Drupal.behaviors.interactiveMap = {
    attach: function (context, settings) {
      var positionOlZoom = function () {
        var map_left = $('.interactive-map').offset().left;
        var window_width = $(window).width();
        var left = window_width - map_left - 50;
        $('.ol-zoom').css('left', left);
      }

      $(window).on('resize', function(){
        positionOlZoom();
      });

      $(document).ready(function () {
        positionOlZoom();
      });

      $(once("mapInstitutionDetailsOpen", ".interactive-map .accordion-collapse"))
        .on("show.bs.collapse", function () {
          document.getElementById("identifyParent").style.display = "none";
          $(this).closest(".results").addClass("open");
        });

      $(once("mapInstitutionDetailsClose", ".interactive-map .accordion-collapse"))
        .on("hide.bs.collapse", function () {
          $(this).closest(".results").removeClass("open");
        });

      $(".interactive-map").on("click", "#showResultsButton", function () {
        let count = $(this).attr("data-result-count");
        if ($(this).attr("data-open") == "open") {
          $(this).attr("data-open", "closed");
          $(this).text("Show " + count + " results");
        } else {
          $(this).text("Hide " + count + " results");
          $(this).attr("data-open", "open");
        }
      });

      $(once("interactiveMap", ".interactive-map", context))
        .each(function () {
          let delta = 0.1;
          let radiusSingle = 15;
          let radiusCluster = 35;
          let lineWidth = 5;
          let lineWidthHighlight = 8;
          let singleFeatureOffsetY = 10;
          let maxClusterSize = 24;

          var clusterUids = [];
          var clusterPaths = [];
          var lastHoverFeature;
          var isAnyClusterHovered;

          var categories = settings.parc_interactive_map.categories;
          Tooltip.Default.allowList["*"].push("style");

          var map_id = $(this).data("map-id");
          var institutions = settings.parc_interactive_map[map_id].institutions;

          const searchParams = new URLSearchParams(window.location.search);
          let zoomOnFeatureId = -1;
          let zoomOnFeature = null;

          if (searchParams.has('focus')) {
              zoomOnFeatureId = searchParams.get('focus');
          } else {
              zoomOnFeatureId = -1;
          }

          const features = new Array(institutions.length);
          for (let i = 0; i < institutions.length; i++) {
            const coordinates = ol.proj.fromLonLat([
              institutions[i].long,
              institutions[i].lat,
            ]);
            features[i] = new ol.Feature(new ol.geom.Point(coordinates));

            // add custom features
            features[i].setProperties({
              id: institutions[i].id,
              countryName: institutions[i].country,
              contentType: institutions[i].content_type,
              categoryId: institutions[i].category,
              name: institutions[i].title,
              roles: institutions[i].roles,
              render_teaser: institutions[i].render_teaser,
              render_full: institutions[i].render_full,
            });

            if (zoomOnFeatureId === institutions[i].id) {
              zoomOnFeature = features[i];
            }
          }

          const source = new ol.source.Vector({
            features: features,
          });

          const clusterSource = new ol.source.Cluster({
            distance: 70,
            minDistance: 70,
            source: source,
          });

          clusterSource.on("clear", function (evt) {
            clusterUids = [];
            clusterPaths = [];
          });

          const styleCache = {};
          const clusters = new ol.layer.Vector({
            source: clusterSource,
            style: function (feature) {
              const size = feature.get("features").length;
              let found = clusterUids.find((el) => el.id === feature.ol_uid);
              if (!found) {
                clusterUids.push({ id: feature.ol_uid, size: size });
              }

              let style = styleCache[ol.util.getUid(feature)];
              if (!style || isAnyClusterHovered) {
                getClusterImage(
                  feature.get("features"),
                  feature.ol_uid,
                  feature
                ).then((canvas) => {
                  var image = new Image();
                  image.crossOrigin = "anonymous";
                  image.src = canvas.toDataURL("image/png");

                  let anchor = [];
                  let offsetY = 0;

                  if (feature.get("features").length === 1) {
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
                      text:
                        size > maxClusterSize
                          ? maxClusterSize + "+"
                          : size.toString(),
                      fill: new ol.style.Fill({
                        color: "#000",
                      }),
                      font: "15px sans-serif",
                      offsetY: offsetY,
                    }),
                  });
                  styleCache[ol.util.getUid(feature)] = style;
                });
              }
              return style;
            },
          });

          const raster = new ol.layer.Tile({
            source: new ol.source.OSM(),
          });

          let mapBasemapSrc;

          try {
            mapBasemapSrc = new ol.source.XYZ({
              url: 'https://gisco-services.ec.europa.eu/maps/tiles/OSMPositronComposite/EPSG3857/{z}/{x}/{y}.png',
              crossOrigin: 'anonymous'
            }); // set primary to OSMPositronComposite
          } catch (error) {
            console.warn(error.message);
            mapBasemapSrc = new ol.source.XYZ({
              url: 'https://gisco-services.ec.europa.eu/maps/tiles/OSMPositronBackground/EPSG3857/{z}/{x}/{y}.png',
              crossOrigin: 'anonymous'
            }); // fallback to OSMPositronBackground
          }

          const mapBkg = new ol.layer.Tile({
            source: mapBasemapSrc,
          });

          let highlightSource = new ol.source.Vector();
          const highlightLayer = new ol.layer.Vector({
            source: highlightSource,
            style: (feature) => {
              let canvas = document.createElement("canvas");
              var ctx = canvas.getContext("2d");
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";

              canvas.setAttribute("width", 2 * radiusSingle + 12);
              canvas.setAttribute("height", 2 * radiusSingle + 22);

              ctx.beginPath();
              ctx.arc(
                radiusSingle + 6,
                radiusSingle + 6,
                radiusSingle,
                0,
                Math.PI * 2
              );
              ctx.closePath();
              ctx.strokeStyle = getColorByCategoryId(feature.get("categoryId"));
              ctx.lineWidth = lineWidthHighlight;
              ctx.stroke();

              var image = new Image();
              image.crossOrigin = "anonymous";
              image.src = canvas.toDataURL("image/png");

              let anchor = [canvas.width / 2, canvas.height - 3];

              let style = new ol.style.Style({
                image: new ol.style.Icon({
                  img: image,
                  imgSize: [canvas.width, canvas.height],
                  anchor: anchor,
                  anchorXUnits: "pixels",
                  anchorYUnits: "pixels",
                }),
              });

              return style;
            },
          });

          const map = new ol.Map({
            target: $(this).attr("id"),
            layers: [mapBkg, clusters, highlightLayer],
            view: new ol.View({
              center: [0, 0],
              zoom: 2,
            }),
          });

          let extent = [
            -6319125.804807394, 3070702.923644739, 9584655.106275197,
            12091128.659149397,
          ];
          if (features.length > 0) {
            extent = source.getExtent();
          }

          let geom = ol.geom.Polygon.fromExtent(extent);
          geom.scale(1.2);

          if (features.length == 1) {
            map.getView().fit(geom, {
              size: map.getSize(),
              duration: 1000,
              // padding: [350, 0, 350, 0],
              maxZoom: 6,
            });
          } else {
            map.getView().fit(geom, {
              size: map.getSize(),
              duration: 1000,
              // padding: [350, 0, 350, 0],
            });
          }

          const popup = new ol.Overlay({
            element: document.getElementById("popup"),
          });
          map.addOverlay(popup);
          const element = popup.getElement();
          let popover = Popover.getInstance(element);

          map.on("moveend", (e) => {
            fillResultsList();
          });

          let selectedFeature;

          if (zoomOnFeature) {
            let ext = zoomOnFeature.getGeometry().getExtent();
            map.getView().fit(ext, {
                size: map.getSize(),
                maxZoom:16,
            });
            selectFeature(zoomOnFeature, true);
            searchParams.delete('focus');
            zoomOnFeatureId = -1;
            zoomOnFeature = null;
          }

          map.on("pointermove", (e) => {
            if (isAnyClusterHovered) {
              lastHoverFeature.setProperties({ highlight: 0 });
              lastHoverFeature.setStyle(lastHoverFeature.getStyle());
              isAnyClusterHovered = false;
            }

            highlightSource.clear();
            if (selectedFeature) {
              highlightSource.addFeature(selectedFeature);
            }
            highlightSource.changed();
            clusters.getFeatures(e.pixel).then((clickedFeatures) => {
              popup.setPosition(0, 0);

              if (clickedFeatures.length) {
                let hoverCluster = clickedFeatures[0];

                const features = clickedFeatures[0].get("features");
                if (features.length === 1) {
                  if (!highlightSource.hasFeature(features[0])) {
                    highlightSource.addFeature(features[0]);
                    highlightSource.changed();
                  }

                  const coordinate = e.coordinate;
                  popup.setPosition(coordinate);

                  if (popover) {
                    popover.dispose();
                  }

                  let info = getFeatureDetails(features[0], false);

                  popover = new Popover(element, {
                    animation: false,
                    container: element,
                    content: `<div>${info.title} ${info.role}</div>`,
                    html: true,
                    placement: "top",
                    title: "Selected feature(s)",
                  });
                  popover.show();
                } else {
                  var geometry = hoverCluster.getGeometry().getCoordinates();
                  var pixelCoords = map.getPixelFromCoordinate(geometry);

                  let marginLeft =
                    pixelCoords[0] - (2 * radiusCluster + lineWidth + 1) / 2;
                  let marginTop =
                    pixelCoords[1] - (2 * radiusCluster + lineWidth + 1) / 2;
                  let relativeX = e.pixel[0] - marginLeft;
                  let relativeY = e.pixel[1] - marginTop;

                  let cluster = clusterPaths.find(
                    (el) => el.id === hoverCluster.ol_uid
                  );
                  if (cluster) {
                    let isSingle = false;

                    cluster.paths.forEach((path) => {
                      if (
                        cluster.ctx.isPointInStroke(
                          path.path,
                          relativeX,
                          relativeY
                        )
                      ) {
                        isSingle = true;

                        const coordinate = e.coordinate;
                        popup.setPosition(coordinate);

                        if (popover) {
                          popover.dispose();
                        }

                        let info = getFeatureDetails(path, true);

                        popover = new Popover(element, {
                          animation: false,
                          container: element,
                          content: `<div>${info.title} ${info.role}</div>`,
                          html: true,
                          placement: "top",
                          title: "Selected feature(s)",
                        });
                        popover.show();
                      }
                    });

                    if (!isSingle & (cluster.paths.length > maxClusterSize)) {
                      const coordinate = e.coordinate;
                      popup.setPosition(coordinate);

                      if (popover) {
                        popover.dispose();
                      }

                      let content = `<p><span>This cluster contains more than 24 institutes, please zoom in to inspect in detail.</span></p>`;

                      popover = new Popover(element, {
                        animation: false,
                        container: element,
                        content: content,
                        html: true,
                        placement: "top",
                        title: "Selected feature(s)",
                      });
                      popover.show();
                    }
                  }
                }
              }
            });
          });

          map.on("click", (e) => {
            clusters.getFeatures(e.pixel).then((clickedFeatures) => {
              if (clickedFeatures.length) {
                // Get clustered Coordinates
                const features = clickedFeatures[0].get("features");

                if (features.length > 1) {
                  const extent = ol.extent.boundingExtent(
                    features.map((r) => r.getGeometry().getCoordinates())
                  );
                  map.getView().fit(extent, {
                    duration: 1000,
                    padding: [350, 350, 350, 350],
                  });
                  document.getElementById("identifyParent").style.display =
                    "none";
                } else {
                  selectFeature(features[0], false);
                }
              } else {
                clearSelection();
              }
            });
          });
          function getClusterImage(features, featureId, clusterFeature) {
            return new Promise((resolve) => {
              let newLineWidth = lineWidth;

              if (clusterFeature.get("highlight") === 1) {
                newLineWidth += 3;
              }

              let addPath = false;
              let foundPath = clusterPaths.find((el) => el.id === featureId);

              if (!foundPath) {
                clusterPaths.push({ id: featureId, ctx: null, paths: [] });
                foundPath = clusterPaths[clusterPaths.length - 1];
                addPath = true;
              }

              let canvas = document.createElement("canvas");
              var ctx = canvas.getContext("2d");
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";

              if (features.length === 1) {
                canvas.setAttribute("width", 2 * radiusSingle + 6);
                canvas.setAttribute(
                  "height",
                  2 * radiusSingle + singleFeatureOffsetY + newLineWidth + 1
                );

                // TODO: remove debugging helpers
                //ctx.rect(0, 0, 2 * radiusSingle + newLineWidth + 1, 2 * radiusSingle + singleFeatureOffsetY + newLineWidth + 1);
                //ctx.stroke();

                ctx.beginPath();
                ctx.arc(
                  radiusSingle + 3,
                  radiusSingle + 3,
                  radiusSingle,
                  0,
                  Math.PI * 2
                );
                ctx.closePath();
                ctx.strokeStyle = getColorByCategoryId(
                  features[0].get("categoryId")
                );
                ctx.lineWidth = newLineWidth;
                ctx.stroke();

                ctx.restore();
                ctx.beginPath();
                ctx.moveTo(radiusSingle + 8, 2 * radiusSingle + 1);
                ctx.lineTo(
                  radiusSingle + 3,
                  2 * radiusSingle + singleFeatureOffsetY
                );
                ctx.lineTo(radiusSingle - 2, 2 * radiusSingle + 1);

                ctx.strokeStyle = getColorByCategoryId(
                  features[0].get("categoryId")
                );
                ctx.lineWidth = newLineWidth;
                ctx.stroke();

                resolve(canvas);
              } else {
                canvas.setAttribute(
                  "width",
                  2 * radiusCluster + newLineWidth + 1
                );
                canvas.setAttribute(
                  "height",
                  2 * radiusCluster + newLineWidth + 1
                );

                let featuresToDraw = [];

                for (let i = 0; i < features.length; i++) {
                  if (i > maxClusterSize) {
                    continue;
                  }

                  featuresToDraw.push({
                    categoryId: features[i].get("categoryId"),
                    name: features[i].get("name"),
                    roles: features[i].get("roles"),
                    children: [features[i]],
                  });
                }

                featuresToDraw = featuresToDraw.sort(compare);

                let interval = (2 * Math.PI) / featuresToDraw.length;
                let drawDelta = delta;
                if (delta > interval) {
                  drawDelta = interval;
                }

                for (let i = 0; i < featuresToDraw.length; i++) {
                  ctx.lineWidth = newLineWidth;
                  ctx.lineCap = "round";
                  let path = new Path2D();

                  if (
                    i * interval + drawDelta >
                    (i + 1) * interval - drawDelta
                  ) {
                    path.arc(
                      radiusCluster + (newLineWidth + 1) / 2,
                      radiusCluster + (newLineWidth + 1) / 2,
                      radiusCluster,
                      i * interval + drawDelta,
                      (i + 1) * interval + drawDelta
                    );
                  } else {
                    path.arc(
                      radiusCluster + (newLineWidth + 1) / 2,
                      radiusCluster + (newLineWidth + 1) / 2,
                      radiusCluster,
                      i * interval + drawDelta,
                      (i + 1) * interval - drawDelta
                    );
                  }

                  ctx.strokeStyle = getColorByCategoryId(
                    featuresToDraw[i].categoryId
                  );
                  ctx.stroke(path);

                  if (addPath) {
                    foundPath.ctx = ctx;
                    foundPath.paths.push({
                      path: path,
                      categoryId: featuresToDraw[i].categoryId,
                      name: featuresToDraw[i].name,
                      roles: featuresToDraw[i].roles,
                    });
                  }
                }
                resolve(canvas);
              }
            });
          }

          async function fillResultsList() {
            var output = [];
            document.querySelector("#resultsParent").innerHTML = "";
            if (clusters) {
              let allClusterFeatures = clusters.getSource().getFeatures();
              let mapExtent = map.getView().calculateExtent();

              let resultsHTML = "";
              for (var i = 0; i < allClusterFeatures.length; i++) {
                var feature = allClusterFeatures[i];
                if (
                  ol.extent.containsExtent(
                    mapExtent,
                    feature.getGeometry().getExtent()
                  )
                ) {
                  let currentFeaturesInCluster = feature.get("features");
                  for (let j = 0; j < currentFeaturesInCluster.length; j++) {
                    output.push(currentFeaturesInCluster[j].get("name"));
                    resultsHTML += `${currentFeaturesInCluster[j].get(
                      "render_teaser"
                    )}`;
                  }
                }
              }

              document.querySelector("#resultsParent").innerHTML = resultsHTML;

              for (var i = 0; i < allClusterFeatures.length; i++) {
                let feature = allClusterFeatures[i];
                if (
                  ol.extent.containsExtent(
                    mapExtent,
                    feature.getGeometry().getExtent()
                  )
                ) {
                  let currentFeaturesInCluster = feature.get("features");
                  for (let j = 0; j < currentFeaturesInCluster.length; j++) {
                    let currentFeature = currentFeaturesInCluster[j];
                    let id = currentFeature.get("id");
                    let element = document.getElementById(`institution-${id}`);

                    if (element) {
                      element.addEventListener(
                        "mouseover",
                        function () {
                          let card = document.getElementById(
                            `institution-${id}`
                          );
                          card.getElementsByClassName(
                            "title"
                          )[0].style.textDecoration = "underline";

                          hoverFeature(id);
                        },
                        false
                      );
                      element.addEventListener(
                        "mouseout",
                        function () {
                          let card = document.getElementById(
                            `institution-${id}`
                          );
                          card.getElementsByClassName(
                            "title"
                          )[0].style.textDecoration = "none";
                        },
                        false
                      );
                    }
                  }
                }
              }

              if (selectedFeature) {
                if (featureInCluster(selectedFeature.get("id")).result) {
                  clearSelection();
                }
              }
            }

            document.querySelector("#showResultsButton").innerHTML =
              "Show " + output.length + " results";
            document
              .querySelector("#showResultsButton")
              .setAttribute("data-result-count", output.length);
          }
          function selectFeature(featureToSelect, focus) {
            highlightSource.clear();
            selectedFeature = featureToSelect;
            highlightSource.addFeature(selectedFeature);
            let id = featureToSelect.get('id');
            if (id) {
              const url = new URL(window.location);
              url.searchParams.set('focus', id);
              window.history.pushState(null, '', url.toString());
            }

            document.getElementById("identifyParent").style.display = "block";
            document.querySelector(
              "#selectedFeatureParent"
            ).innerHTML = `${featureToSelect.get("render_teaser")}`;
            if (!focus) {
              $(".interactive-map .accordion-collapse").collapse("hide");
            }

            setTimeout(() => {
              highlightSource.changed();
            }, 50);
          }
          function clearSelection() {
            document.getElementById("identifyParent").style.display = "none";
            selectedFeature = null;
            highlightSource.clear();
            highlightSource.changed();

            const url = new URL(window.location);
            url.searchParams.delete('focus');
            window.history.pushState(null, '', url.toString());
          }
          function featureInCluster(featureId) {
            let allClusterFeatures = clusters.getSource().getFeatures();
            for (var i = 0; i < allClusterFeatures.length; i++) {
              var feature = allClusterFeatures[i];
              let currentFeaturesInCluster = feature.get("features");
              for (let j = 0; j < currentFeaturesInCluster.length; j++) {
                if (currentFeaturesInCluster[j].get("id") === featureId) {
                  return {
                    result: currentFeaturesInCluster.length > 1 ? true : false,
                    feature: currentFeaturesInCluster[j],
                    cluster: feature,
                  };
                }
              }
            }
            return false;
          }
          function hoverFeature(featureId) {
            highlightSource.clear();
            if (isAnyClusterHovered) {
              lastHoverFeature.setProperties({ highlight: 0 });
              lastHoverFeature.setStyle(lastHoverFeature.getStyle());
            }
            let isInCluster = featureInCluster(featureId);
            if (isInCluster.result === false) {
              highlightSource.addFeature(isInCluster.feature);
            } else {
              isInCluster.cluster.setProperties({ highlight: 1 });
              lastHoverFeature = isInCluster.cluster;
              isAnyClusterHovered = true;
            }

            highlightSource.changed();
            isInCluster.cluster.setStyle(isInCluster.cluster.getStyle());
          }
          function getFeatureDetails(feature, isPath) {
            let markup = {
              title: `<div class="title">${
                isPath ? feature.name : feature.get("name")
              }</div>`,
              role: "",
            };

            let roles = isPath ? feature.roles : feature.get("roles");
            let country = isPath ? feature.countryName : feature.get("countryName");
            let contentType = isPath ? feature.contentType : feature.get("contentType");

            let role_main_txt = '';
            let role_additional_txt = '';

            if (contentType === 'institution') {
              role_main_txt = getRolesMarkup(
                roles.main_secondary,
                "Main roles"
              );
              role_additional_txt = getRolesMarkup(
                roles.additional,
                "Additional roles"
              );
            }
            else if (contentType === 'laboratory') {
              role_main_txt = '<div class="country">' + country + '</div>';
            }

            markup.role = role_main_txt + role_additional_txt;

            return markup;
          }

          function getRolesMarkup(roles, title) {
            let role_txt = "";

            if (roles.length > 0) {
              if (title && roles[0].show_type) {
                role_txt = `<span class='identify-role-span'>${title}</span>`;
              }
              role_txt += "<ul>";
              for (let i = 0; i < roles.length; i++) {
                role_txt += `<li><span class="identify-rectangle-span" style="background-color: ${roles[i].color}">&nbsp;</span><span style="color: ${roles[i].color};">${roles[i].label}</span></li>`;
              }

              role_txt += "</ul>";
            }

            return role_txt;
          }

          function compare(a, b) {
            if (a.categoryId < b.categoryId) {
              return -1;
            }
            if (a.categoryId > b.categoryId) {
              return 1;
            }
            return 0;
          }
          function getColorByCategoryId(id) {
            let found = categories.find((el) => el.id === id);
            if (found) {
              return found.color;
            } else return "#000";
          }
        });
    },
  };
})(jQuery, Drupal, drupalSettings, once);
