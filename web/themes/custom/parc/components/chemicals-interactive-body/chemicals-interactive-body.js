/**
 * @file
 * Chemicals Interactive Body component logic.
 */

((Drupal, once) => {
  Drupal.behaviors.chemicalsInteractiveBody = {
    attach(context) {
      const elements = once('chemicals-interactive-body', '.js-chemicals-interactive-body', context);

      elements.forEach((el) => {
        const assetsPath = el.dataset.assetsPath;
        const bodyLayersWrapper = el.querySelector('#body-layers-wrapper');
        const filterMenu = el.querySelector('#filter-menu');
        const bodyDotsWrapper = el.querySelector('#body-dots-wrapper');
        const menuItemsWrapper = el.querySelector('#menu-items-wrapper');

        // SVG state
        let dotsSvgEl = null;
        let menuItemsSvgEl = null;
        let _dots = [];

        const bodyLayers = new Map();
        const chemLayers = new Map();
        const centroidColors = new Map();
        const centroidToLabels = new Map();
        const layerIdToCentroids = new Map();
        const chemicalsToMenuItems = new Map();

        // Constants
        const BASE_FILL = '#152B29';
        const MAX_HALO_DIST = 100;
        const MAX_HALO_GROW_FACTOR = 1.8;
        const chemicals = [
          "Arsenic",
          "Pesticides",
          "Phthalates",
          "PFASs",
          "Bisphenol",
          "Mercury",
          // "DINCH & Plasticisers",
          // "Metals",
          // "Microplastics",
          // "Nanoplastics"
        ]
        const TARGET_FPS = 60;
        const FRAME_INTERVAL = 1000 / TARGET_FPS;

        // State
        let rafId = null;
        let mouse = { x: 0, y: 0 };
        let tempPoint = null;
        let activeCentroid = null;
        let activeDiseaseId = null;
        let activeChemicalId = null;
        let lastFrameTime = 0;

        const chemicalLookup = Object.fromEntries(chemicals.map(c => [c.toUpperCase(), c]));

        // Filter functions
        const updateMenuItems = () => {
          const menuItems = menuItemsWrapper.querySelectorAll(".menu-item");
          for (const menuItem of menuItems) {
            const id = menuItem.id;
            const ellipse = menuItem.querySelector('[id*="Ellipse"]');
            const hover = menuItem.querySelector('[id*="hover"]');
            const smallCircle = menuItem.parentElement.querySelector(`#C_${id}`);

            if (activeChemicalId != null) {
              ellipse.classList.add("inactive");
              smallCircle.classList.remove("inactive");
              smallCircle.classList.remove("active");
              menuItem.classList.remove("half-active");
              menuItem.classList.add("inactive");
            } else {
              menuItem.classList.remove("half-active");
              menuItem.classList.remove("inactive");
              ellipse.classList.remove("inactive");
              hover.classList.remove("inactive");
              smallCircle.classList.remove("active");
            }
          }
        };

        const toggleResetBtn = (state) => {
          const div = el.querySelector("#filter-reset-btn-cnt");
          if (div) {
            div.style.display = state ? "flex" : "none";
          }
        };

        const handleFilterChange = (e) => {
          if (e.target.matches('input[type="radio"]')) {
            const chem = e.target.dataset.chem;
            const targetState = e.target.checked;

            if (targetState == true) {
              if (activeDiseaseId != null) {
                toggleBodyLayer(null);
                activeDiseaseId = null;
              }
              activeChemicalId = chem;
              toggleResetBtn(true);
            } else {
              activeChemicalId = null;
              toggleResetBtn(false);
            }

            updateMenuItems();
            toggleChemLayer();
            toggleFaqGroups(activeChemicalId ? activeChemicalId.toLowerCase() : 'global');
          }
        };

        const resetFilter = () => {
          const input = el.querySelector(`#filter-${activeChemicalId}`);
          if (input) input.checked = false;
          activeChemicalId = null;
          toggleResetBtn(false);
          updateMenuItems();
          toggleChemLayer();
        };

        const initFilter = () => {
          const generateListElements = () => {
            return chemicals.map(chem => {
              return `<li>
                <input type="radio" name="chem-filter" data-chem="${chem}" id="filter-${chem}">
                <label for="filter-${chem}">${chem}</label>
              </li>`;
            }).join('');
          };

          filterMenu.innerHTML += `<ul id="filter-list">
            ${generateListElements()}
          </ul>`;

          filterMenu.innerHTML += `<div id="filter-reset-btn-cnt">
            <button id="filter-reset-btn">RESET</button>
          </div>`;

          const list = filterMenu.querySelector('#filter-list');
          list.addEventListener('change', handleFilterChange);

          const btn = filterMenu.querySelector('#filter-reset-btn');
          btn.addEventListener('click', resetFilter);
        };

        const toggleFaqGroups = (groupId) => {
          const groups = document.querySelectorAll('[data-faq-group]');
          groups.forEach((group) => {
            if (group.dataset.faqGroup === groupId) {
              group.style.display = 'block';
            } else {
              group.style.display = 'none';
            }
          });
        };

        const fetchAndProcessChemLayer = async (path) => {
          const svgText = await fetch(path).then(r => r.text());
          const layer = document.createElement('div');
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, 'image/svg+xml');
          const firstGroup = doc.querySelector('svg > g');
          const fullId = firstGroup?.id || '';

          layer.className = 'chem-layer';
          layer.id = fullId;
          layer.dataset.chemical = chemicalLookup[fullId];
          layer.innerHTML = svgText;

          const layerSvg = layer.querySelector('svg');
          if (!layerSvg) return;

          bodyLayersWrapper.appendChild(layer);
          chemLayers.set(chemicalLookup[fullId], { layerEl: layer, layerSvg: layerSvg });
        };

        const fetchAndProcessBodyLayer = async (path) => {
          const svgText = await fetch(path).then(r => r.text());
          const layer = document.createElement('div');
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, 'image/svg+xml');
          const firstGroup = doc.querySelector('svg > g');
          const fullId = firstGroup?.id || '';

          const diseaseName = sanitizeId(fullId);
          const divId = diseaseId(fullId);

          layer.className = 'body-layer';
          layer.id = divId;
          layer.dataset.disease = diseaseName;
          layer.innerHTML = svgText;

          const layerSvg = layer.querySelector('svg');
          if (!layerSvg) return;

          bodyLayersWrapper.appendChild(layer);
          bodyLayers.set(divId, { layerEl: layer, layerSvg: layerSvg });
        };

        const toggleChemLayer = () => {
          const layers = el.querySelectorAll(".chem-layer");
          for (const chemLayer of layers) {
            const chem = chemLayer.dataset.chemical;
            if (chem == activeChemicalId) {
              chemLayer.classList.add("is-active");
            } else {
              chemLayer.classList.remove("is-active");
            }
          }
          if (activeChemicalId) {
            revealDots(activeChemicalId);
          }
        };

        const toggleBodyLayer = (id) => {
          for (const { layerEl } of bodyLayers.values()) {
            layerEl.classList.remove('is-active');
          }
          const entry = bodyLayers.get(id);
          if (!entry) {
            console.warn(`No body layer found for disease ID: ${id}`, bodyLayers);
            return;
          }
          entry.layerEl.classList.add('is-active');
          revealDots(activeDiseaseId);
        };

        const initBodyLayers = async () => {
          const jobs = [];
          for (let i = 0; i <= 8; i++) {
            const path = `${assetsPath}body-layer-${i}.svg`;
            jobs.push(fetchAndProcessBodyLayer(path));
          }
          await Promise.all(jobs).catch(console.error);
        };

        const initChemLayers = async () => {
          const jobs = [];
          for (let i = 0; i <= 5; i++) {
            const cpath = `${assetsPath}chemicals-${i}.svg`;
            jobs.push(fetchAndProcessChemLayer(cpath));
          }
          await Promise.all(jobs).catch(console.error);
        };

        const getSVGPoint = (layerSvg, evt) => {
          const pt = layerSvg.createSVGPoint();
          pt.x = evt.clientX;
          pt.y = evt.clientY;
          return pt.matrixTransform(layerSvg.getScreenCTM().inverse());
        };

        const resetDotColors = () => {
          _dots.forEach(dot => dot.setAttribute('fill', 'black'));
        };

        const highlightDots = (nearestCentroid) => {
          activeCentroid = nearestCentroid;
          let id = activeDiseaseId || activeChemicalId;
          if (!id) return;

          const { cx: sx, cy: sy } = findCentroidCenter(nearestCentroid);
          const key = `${id}-${activeCentroid.dataset.index}`;
          const label = centroidToLabels.get(key);
          let filteredPalette = ['#000000'];

          if (label) {
            const chemPills = Array.from(label.querySelectorAll('[id^="B_"]'));
            const activeColors = chemPills
              .map(chem => {
                const rawId = chem.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase();
                const chemicalName = chemicalLookup[rawId];
                return chemicalName ? getButtonColor(chem) : null;
              })
              .filter(color => color !== null);
            if (activeColors.length > 0) filteredPalette = [...new Set(activeColors)];
          }

          _dots.forEach(dot => {
            const cx = parseFloat(dot.getAttribute('cx'));
            const cy = parseFloat(dot.getAttribute('cy'));
            const dist = Math.hypot(cx - sx, cy - sy);
            if (dist <= CENTROID_RADIUS) {
              const seed = parseFloat(dot.dataset.colorSeed) || Math.random();
              const pick = filteredPalette[Math.floor(seed * filteredPalette.length) % filteredPalette.length];
              dot.setAttribute('fill', pick);
            } else {
              dot.setAttribute('fill', 'black');
            }
          });
        };

        const revealDots = (id) => {
          const shuffled = _dots.slice().sort(() => Math.random() - 0.5);
          shuffled.forEach((dot, i) => {
            const baseR = parseFloat(dot.dataset.baseR);
            const targetR = id ? parseFloat(dot.dataset[`targetR${id}`]) : baseR;
            setTimeout(() => {
              dot.dataset.currentBase = targetR * 1.4;
            }, i * 1);
            setTimeout(() => {
              dot.dataset.currentBase = targetR;
            }, i * 1 + shuffled.length);
          });
        };

        const initCentroids = (layerSvg, id) => {
          let ct = layerSvg.querySelectorAll('#centroids > circle');
          if (ct.length == 0) ct = layerSvg.querySelectorAll('#centroids > path');
          const centroids = Array.from(ct);
          const validCentroids = [];

          centroids.forEach(centroid => {
            centroid.style.visibility = 'hidden';
            const idx = getIndex(centroid.id);
            centroid.dataset.index = idx;
            const key = `${id}-${idx}`;
            const label = layerSvg.querySelector(`[id*="${idx}_TEXT"]`);
            if (label) {
              const allPills = Array.from(label.querySelectorAll('[id^="B_"]'));
              const validPills = allPills.filter(pill => {
                const rawId = pill.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase();
                return chemicalLookup[rawId];
              });

              if (validPills.length > 0) {
                centroidToLabels.set(key, label);
                const colors = [...new Set(validPills.map(getButtonColor))];
                centroidColors.set(key, colors);
                validCentroids.push(centroid);
              } else {
                label.style.display = 'none';
              }
            }
          });
          layerIdToCentroids.set(id, validCentroids);
        };

        const initDots = async () => {
          const svgText = await fetch(`${assetsPath}body-dots.svg`).then(r => r.text());
          bodyDotsWrapper.innerHTML = svgText;
          dotsSvgEl = bodyDotsWrapper.querySelector('svg');
          if (!tempPoint) tempPoint = dotsSvgEl.createSVGPoint();
          const dots = Array.from(dotsSvgEl.querySelectorAll('circle'));
          _dots = dots;

          _dots.forEach(dot => {
            const cx = parseFloat(dot.getAttribute('cx'));
            const cy = parseFloat(dot.getAttribute('cy'));
            const radius = parseFloat(dot.getAttribute('r')) || 2;
            dot.dataset.baseR = radius;
            dot.setAttribute('fill', BASE_FILL);
            dot._cx = cx;
            dot._cy = cy;
            if (!dot.dataset.colorSeed) dot.dataset.colorSeed = String(Math.random());

            layerIdToCentroids.forEach((centroids, id) => {
              let haloFactor = 1;
              centroids.forEach(centroid => {
                const { cx: sx, cy: sy } = findCentroidCenter(centroid);
                const dist = Math.hypot(cx - sx, cy - sy);
                if (dist < 40) {
                  const t = 1 - dist / 40;
                  const f = 1 + t * (2.1 - 1);
                  haloFactor = Math.max(haloFactor, f);
                }
              });
              dot.dataset[`targetR${id}`] = radius * haloFactor;

              centroids.forEach(centroid => {
                const { cx: sx, cy: sy } = findCentroidCenter(centroid);
                const dist = Math.hypot(cx - sx, cy - sy);
                if (dist < 40) {
                  const idx = centroid.dataset.index;
                  if (!dot.dataset[`centroidIndices${id}`]) {
                    dot.dataset[`centroidIndices${id}`] = idx;
                  } else {
                    dot.dataset[`centroidIndices${id}`] += ',' + idx;
                  }
                }
              });
            });
          });
          return dots;
        };

        const getIndex = (id) => {
          const m = id && id.match(/(\d+)/);
          return m ? m[1] : null;
        };

        const getLabelsForCentroid = (id, centroid) => {
          const idx = centroid.dataset.index;
          return centroidToLabels.get(`${id}-${idx}`) || null;
        };

        const getButtonColor = (buttonGroup) => {
          let rect = buttonGroup.querySelector('rect') || buttonGroup.querySelector('[id^="Rectangle"]');
          if (rect) {
            const cs = window.getComputedStyle(rect);
            if (cs && cs.fill && cs.fill !== 'none') return cs.fill;
            const a = rect.getAttribute('fill');
            if (a && a !== 'none') return a;
          }
          const csG = window.getComputedStyle(buttonGroup);
          if (csG && csG.fill && csG.fill !== 'none') return csG.fill;
          return buttonGroup.getAttribute('fill') || '#000000';
        };

        const toggleLabels = (allCentroids, nearestCentroid) => {
          const activeId = activeDiseaseId || activeChemicalId;
          const nearestLabel = nearestCentroid ? getLabelsForCentroid(activeId, nearestCentroid) : null;
          const otherLabels = allCentroids.filter(c => c !== nearestCentroid).map(c => getLabelsForCentroid(activeId, c)).filter(Boolean);

          otherLabels.forEach(lab => {
            lab.classList.add("inactive");
            const segs = lab._lines || [];
            segs.forEach(seg => {
              const len = parseFloat(seg.dataset.pathLen) || 0;
              seg.style.strokeDashoffset = len;
            });
          });

          if (nearestLabel) {
            nearestLabel.classList.remove("inactive");
            const segs = nearestLabel._lines || [];
            segs.forEach(seg => seg.style.strokeDashoffset = 0);
          }
        };

        const resetLabels = (centroids) => {
          centroids.forEach(centroid => {
            const label = getLabelsForCentroid(activeDiseaseId || activeChemicalId, centroid);
            if (label) {
              const chemPills = Array.from(label.querySelectorAll('[id^="B_"]'));
              let shouldBeVisible = chemPills.length === 0;
              chemPills.forEach((chem) => {
                const rawId = chem.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase();
                if (chemicalLookup[rawId]) shouldBeVisible = true;
              });
              if (shouldBeVisible) label.classList.remove("inactive");
              else label.classList.add("inactive");
            }
          });
        };

        const initLabelsAndPills = (layerSvg) => {
          const labels = Array.from(layerSvg.querySelectorAll('[id*="_TEXT"]'));
          labels.forEach(lbl => {
            const segs = Array.from(lbl.querySelectorAll('line, path, polyline, polygon'));
            lbl._lines = segs;
            segs.forEach(seg => {
              if (!seg.getTotalLength) return;
              const len = seg.getTotalLength();
              seg.dataset.pathLen = String(len);
              seg.style.strokeDasharray = len;
              seg.style.strokeDashoffset = len;
            });

            const pills = Array.from(lbl.querySelectorAll('[id^="B_"]'));
            pills.forEach(pill => {
              const rawId = pill.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase();
              const chemicalName = chemicalLookup[rawId];

              if (chemicalName) {
                pill.addEventListener('click', () => {
                  handlePillClick(chemicalName.toLowerCase());
                });
              } else {
                pill.style.display = 'none';
              }
            });
          });
        };

        const updateMenuItemCircles = () => {
          const allCircles = menuItemsSvgEl.querySelectorAll('[id^="C_D"]');
          allCircles.forEach(circle => {
            const dId = circle.id.replace('C_', '');
            const menuItem = menuItemsSvgEl.querySelector(`#${dId}`);
            if (dId === activeDiseaseId) {
              circle.classList.add('inactive');
              circle.classList.remove('active');
            } else {
              if (menuItem && !menuItem.classList.contains('inactive')) {
                circle.classList.remove('inactive');
                circle.classList.add('active');
              } else {
                circle.classList.add('inactive');
                circle.classList.remove('active');
              }
            }
          });
        };

        const associateMenuItems = () => {
          const menuItems = menuItemsWrapper.querySelectorAll(".menu-item");
          for (const menuItem of menuItems) {
            const id = menuItem.id;
            const labels = Array.from(centroidToLabels.entries()).filter(([key]) => key.startsWith(`${id}-`)).map(([, v]) => v);

            let hasValidChemicals = false;

            labels.forEach((lbl) => {
              const chemPills = Array.from(lbl.querySelectorAll('[id^="B_"]'));
              chemPills.forEach((chem) => {
                const rawId = chem.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase();
                const chemicalName = chemicalLookup[rawId];
                if (chemicalName) {
                  hasValidChemicals = true;
                  if (!chemicalsToMenuItems.has(chemicalName)) chemicalsToMenuItems.set(chemicalName, new Set());
                  chemicalsToMenuItems.get(chemicalName).add(id);
                }
              });
            });

            if (!hasValidChemicals) {
              menuItem.style.display = 'none';
              const smallCircle = menuItem.parentElement.querySelector(`#C_${id}`);
              if (smallCircle) {
                smallCircle.style.display = 'none';
              }
            }
          }
        };

        const toggleMenuItem = (id) => {
          const allGroups = menuItemsSvgEl.querySelectorAll('[id^="D"]');
          allGroups.forEach(group => {
            const ellipse = group.querySelector('[id*="Ellipse"]');
            if (ellipse) {
              if (group.id === id) ellipse.classList.remove('inactive');
              else ellipse.classList.add('inactive');
            }
          });
          updateMenuItemCircles();
        };

        const initMenuItems = async () => {
          const svgText = await fetch(`${assetsPath}menu-items.svg`).then(r => r.text());
          menuItemsWrapper.innerHTML = svgText;
          menuItemsSvgEl = menuItemsWrapper.querySelector('svg');
          const menuItems = Array.from(menuItemsSvgEl.querySelectorAll('[id^="D"]'));
          const menuItemSmallCircles = Array.from(menuItemsSvgEl.querySelectorAll('[id^="C_D"]'));

          menuItems.forEach(el => el.classList.add('menu-item'));
          menuItemSmallCircles.forEach(el => el.classList.add('menu-item-inactive'));
          menuItems.forEach(el => el.addEventListener('click', () => selectDisease(el.id)));
        };

        const handleMouseMove = (evt) => {
          if (!dotsSvgEl) return;
          const p = getSVGPoint(dotsSvgEl, evt);
          mouse.x = p.x;
          mouse.y = p.y;
        };

        const handlePillClick = (chemicalId) => {
          const target = document.querySelector(`[data-chemical="${chemicalId}"]`);
          if (target) {
            const topOffset = target.getBoundingClientRect().top + window.pageYOffset - 40;
            window.scrollTo({
              top: topOffset,
              behavior: 'smooth'
            });
            const toggle = target.querySelector('.js-chemical-accordion-toggle');
            if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
              toggle.click();
            }
          }
        };

        const sanitizeId = (id) => {
          return id.replace(/^ASSET ANIMATION D\d+\s+/, '').replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec)).trim().replace(/[^\w\s&-]/g, '');
        };

        const diseaseId = (fullId) => {
          return fullId.match(/(D\d+)/)?.[1];
        };

        const selectDisease = (id) => {
          if (activeChemicalId != null) return;
          activeDiseaseId = id;
          toggleMenuItem(id);
          toggleBodyLayer(id);
          toggleFaqGroups(id);
        };

        const findCentroidCenter = (centroid) => {
          let cx = parseFloat(centroid.getAttribute('cx'));
          let cy = parseFloat(centroid.getAttribute('cy'));
          if (isNaN(cx) || isNaN(cy)) {
            const bbox = centroid.getBBox();
            cx = bbox.x + bbox.width / 2;
            cy = bbox.y + bbox.height / 2;
          }
          return { cx, cy };
        };

        const render = () => {
          rafId = null;
          const diseaseCentroids = layerIdToCentroids.get(activeDiseaseId);
          const chemicalCentroids = layerIdToCentroids.get(activeChemicalId);

          let nearestCentroid = null;
          let minDist = Infinity;

          _dots.forEach(dot => {
            const baseR = parseFloat(dot.dataset.baseR);
            let targetR = baseR;
            if (activeDiseaseId) targetR = parseFloat(dot.dataset[`targetR${activeDiseaseId}`]);
            else if (activeChemicalId) targetR = parseFloat(dot.dataset[`targetR${activeChemicalId}`]);

            const currentBase = parseFloat(dot.dataset.currentBase) || targetR;
            const dist = Math.hypot(dot._cx - mouse.x, dot._cy - mouse.y);
            let factor = 1;
            if (dist < MAX_HALO_DIST) {
              const t = 1 - dist / MAX_HALO_DIST;
              factor = 1 + t * (MAX_HALO_GROW_FACTOR - 1);
            }
            dot.setAttribute('r', currentBase * factor);
          });

          const assignNearest = (centroids) => {
            centroids.forEach(centroid => {
              const { cx, cy } = findCentroidCenter(centroid);
              const dist = Math.hypot(cx - mouse.x, cy - mouse.y);
              if (dist < CENTROID_RADIUS && dist < minDist) {
                minDist = dist;
                nearestCentroid = centroid;
              }
            });
          };

          if (diseaseCentroids) assignNearest(diseaseCentroids);
          else if (chemicalCentroids) assignNearest(chemicalCentroids);

          resetDotColors();

          if (nearestCentroid != null) {
            highlightDots(nearestCentroid);
            if (activeDiseaseId != null) toggleLabels(diseaseCentroids, nearestCentroid);
            else if (activeChemicalId != null) toggleLabels(chemicalCentroids, nearestCentroid);
          } else {
            if (activeDiseaseId != null) resetLabels(diseaseCentroids);
            else if (activeChemicalId != null) resetLabels(chemicalCentroids);
          }
        };

        const requestRender = (timestamp = 0) => {
          const elapsed = timestamp - lastFrameTime;
          if (elapsed >= FRAME_INTERVAL) {
            lastFrameTime = timestamp;
            render();
          }
          rafId = requestAnimationFrame(requestRender);
        };

        const init = async () => {
          await initMenuItems();
          await initBodyLayers();
          await initChemLayers();

          bodyLayers.forEach((layer, dId) => {
            initLabelsAndPills(layer.layerSvg);
            initCentroids(layer.layerSvg, dId);
          });

          chemLayers.forEach((layer, cId) => {
            initLabelsAndPills(layer.layerSvg);
            initCentroids(layer.layerSvg, cId);
          });

          await initDots();
          revealDots(null);
          initFilter();
          associateMenuItems();

          window.addEventListener('mousemove', handleMouseMove, { passive: false });
          toggleFaqGroups('global');
          requestAnimationFrame(requestRender);
        };

        init();
      });
    },
  };
})(Drupal, once);
