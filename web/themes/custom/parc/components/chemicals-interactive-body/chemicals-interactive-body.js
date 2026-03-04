((Drupal, once) => {
    Drupal.behaviors.chemicalsInteractiveBody = {
        attach(context) {
            const elements = once('chemicals-interactive-body', '.js-chemicals-interactive-body', context);

            elements.forEach((el) => {
                const assetsPath = el.dataset.assetsPath;
                const bodyLayersWrapper = el.querySelector('#body-layers-wrapper');
                // filterMenu is now an external ID because the user moved it
                const filterMenu = document.getElementById('filter-menu');
                const bodyDotsWrapper = el.querySelector('#body-dots-wrapper');
                const menuItemsWrapper = el.querySelector('#menu-items-wrapper');

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

                const chemicals = [
                    "Arsenic",
                    "Pesticides",
                    "Phthalates",
                    "PFASs",
                    "Bisphenols",
                    "Mercury",
                    // "DINCH & Plasticisers", 
                    // "Metals", 
                    // "Microplastics", 
                    // "Nanoplastics"
                ]

                const chemicalColors = {
                    "Arsenic": "#C064E4",
                    "Pesticides": "#5658E7",
                    "Phthalates": "#9B9B9B",
                    "PFASs": "#E45C4D",
                    "Bisphenols": "#D7B040",
                    "Mercury": "#E21337",
                }

                // DOM
                let mobile = false;



                // SVG
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
                const CENTROID_RADIUS = 45;
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


                // Filter
                function updateMenuItems() {
                    const menuItems = el.querySelectorAll(".menu-item");
                    const toShow = chemicalsToMenuItems.get(activeChemicalId);

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
                            ellipse.classList.remove("inactive")
                            hover.classList.remove("inactive");
                            smallCircle.classList.remove("active");
                        }
                    }
                }

                function toggleResetBtn(state) {
                    const div = document.getElementById("filter-reset-btn-cnt");
                    if (!div) return;
                    div.style.display = state ? "flex" : "none";
                }

                const handleFilterChange = (e) => {
                    let chem;
                    let targetState;

                    if (e.target.matches && e.target.matches('input[name="chem-filter"]')) {
                        chem = e.target.dataset.chem;
                        targetState = e.target.checked;
                    } else if (e.target.dataset && e.target.dataset.chem) {
                        chem = e.target.dataset.chem;
                        targetState = true;
                    } else {
                        return;
                    }

                    if (targetState === true) {
                        // Simulate single-select behavior with checkboxes.
                        const actualInput = el.parentElement.querySelector(`input[data-chem="${chem}"]`);
                        el.parentElement.querySelectorAll('input[name="chem-filter"]').forEach(input => {
                            if (input !== actualInput) input.checked = false;
                        });
                        if (actualInput) actualInput.checked = true;

                        if (activeDiseaseId != null) {
                            toggleBodyLayer(null);
                            activeDiseaseId = null;
                        }
                        activeChemicalId = chem;
                        toggleResetBtn(true);

                        // Update URL.
                        const url = new URL(window.location);
                        if (url.searchParams.get('chemical') !== chem) {
                            url.searchParams.set('chemical', chem);
                            window.history.pushState({}, '', url);
                        }
                    } else {
                        activeChemicalId = null;
                        toggleResetBtn(false);

                        // Remove from URL.
                        const url = new URL(window.location);
                        if (url.searchParams.has('chemical')) {
                            url.searchParams.delete('chemical');
                            window.history.pushState({}, '', url);
                        }
                    }

                    updateMenuItems();
                    toggleChemLayer();
                    toggleFaqGroups(activeChemicalId ? activeChemicalId.toLowerCase() : 'global');
                };

                const resetFilter = () => {
                    el.querySelectorAll('input[name="chem-filter"]').forEach(input => {
                        input.checked = false;
                    });
                    activeChemicalId = null;
                    toggleResetBtn(false);
                    updateMenuItems();
                    toggleChemLayer();
                    toggleFaqGroups('global');

                    // Remove from URL.
                    const url = new URL(window.location);
                    url.searchParams.delete('chemical');
                    window.history.pushState({}, '', url);
                };

                function resetFilterMobile(e) {
                    if (e) e.stopPropagation();
                    const trigger = el.querySelector("#dropup-trigger");
                    trigger.textContent = "Chemicals";
                    trigger.classList.remove('overflowing');
                    trigger.style.backgroundColor = '';
                    trigger.style.color = '';
                    trigger.style.paddingRight = ''
                    trigger.style.removeProperty('--marquee-offset');
                    trigger.style.removeProperty('--marquee-start');
                    _dots.forEach(dot => dot.style.opacity = '');
                    revealCentroids(null);
                    activeChemicalId = null;
                    activeDiseaseId = null;
                    toggleResetBtn(false);
                    updateMenuItems();
                    toggleChemLayer();

                    const existingReset = el.querySelector("#filter-reset-mobile");
                    if (existingReset) existingReset.remove();
                }

                function initFilter() {
                    if (mobile) {
                        const trigger = el.querySelector("#dropup-trigger");
                        const list = el.querySelector("#dropup-list");

                        list.innerHTML = chemicals.map(chem => {
                            const color = chemicalColors[chem] || '#000000';
                            return `<li data-chem="${chem}" data-label="${chem}" style="color: ${color}">${chem}</li>`;
                        }).join('');

                        let marqueeActive = false;
                        trigger.addEventListener("click", () => {
                            list.classList.toggle("open");
                            if (!marqueeActive) {
                                requestAnimationFrame(() => {
                                    applyMarquee(list);
                                    marqueeActive = true;
                                });
                            }
                        });

                        list.querySelectorAll("li").forEach(li => {
                            li.addEventListener("click", () => {
                                const chem = li.dataset.chem;
                                const label = li.dataset.label;
                                const color = chemicalColors[chem] || '#eeeeee';
                                applyMarqueeSingle(trigger, label);
                                const existing = el.querySelector("#filter-reset-mobile");
                                if (existing) existing.remove();
                                const wrapper = el.querySelector("#filter-menu-mobile");
                                const resetBtn = document.createElement('button');
                                resetBtn.id = 'filter-reset-mobile';
                                resetBtn.textContent = '✕';
                                wrapper.appendChild(resetBtn);
                                resetBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    resetFilterMobile();
                                });
                                trigger.style.backgroundColor = color;
                                trigger.style.color = '#000000';
                                list.classList.remove("open");
                                handleFilterChange({ target: { dataset: { chem } } });

                                el.querySelector("#filter-reset-mobile").addEventListener("click", (e) => {
                                    e.stopPropagation();
                                    resetFilterMobile();
                                });
                            });
                        });


                        document.addEventListener("click", (e) => {
                            if (!e.target.closest("#filter-menu-mobile")) {
                                list.classList.remove("open");
                            }
                        });
                    } else {
                        const generateListElements = () => {
                            return chemicals.map(chem => {
                                return `
                <div class="js-form-item form-item js-form-type-checkbox">
                  <input type="checkbox" name="chem-filter" data-chem="${chem}" id="filter-${chem}" class="form-checkbox form-check-input">
                  <label for="filter-${chem}" class="option">${chem}</label>
                </div>`;
                            }).join('');
                        };

                        filterMenu.innerHTML = `
            <details class="form-item js-form-wrapper form-wrapper" id="edit-chemicals-collapsible">
              <summary role="button">${Drupal.t('Filter by chemical')}</summary>
              <div id="edit-chemicals" class="form-checkboxes">
                <div class="form-checkboxes bef-checkboxes">
                  ${generateListElements()}
                </div>
              </div>
            </details>
            <div id="filter-reset-btn-cnt" style="display: none;">
              <button id="filter-reset-btn">${Drupal.t('RESET')}</button>
            </div>
          `;

                        const list = filterMenu.querySelector('#edit-chemicals');
                        list.addEventListener('change', handleFilterChange);

                        const btn = filterMenu.querySelector('#filter-reset-btn');
                        btn.addEventListener('click', resetFilter);

                        // Check URL for initial filter state.
                        const urlParams = new URLSearchParams(window.location.search);
                        const chemicalParam = urlParams.get('chemical');

                        if (chemicalParam) {
                            // Find the checkbox for this chemical (case-insensitive check might be needed if params vary).
                            // The chemicals array and checkbox Ids match the parameter (usually).
                            // Let's find a matching chemical in our list.
                            const matchingChem = chemicals.find(c => c.toLowerCase() === chemicalParam.toLowerCase());

                            if (matchingChem) {
                                const checkbox = filterMenu.querySelector(`input[data-chem="${matchingChem}"]`);
                                if (checkbox) {
                                    // Trigger click to activate filter and run existing logic.
                                    checkbox.click();
                                }
                            }
                        }
                    }
                }

                // Body Layers
                async function fetchAndProcessChemLayer(path) {
                    const svgText = await fetch(path).then(r => r.text());
                    const layer = document.createElement('div');

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgText, 'image/svg+xml');
                    const firstGroup = doc.querySelector('svg > g');
                    const fullId = firstGroup ? firstGroup.id : '';

                    layer.className = 'chem-layer';
                    layer.id = fullId;
                    layer.dataset.chemical = chemicalLookup[fullId];
                    layer.innerHTML = svgText;

                    const layerSvg = layer.querySelector('svg');
                    if (!layerSvg) return;

                    bodyLayersWrapper.appendChild(layer);
                    chemLayers.set(chemicalLookup[fullId], { layerEl: layer, layerSvg: layerSvg });
                }

                async function fetchAndProcessBodyLayer(path) {
                    const svgText = await fetch(path).then(r => r.text());
                    const layer = document.createElement('div');

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgText, 'image/svg+xml');
                    const firstGroup = doc.querySelector('svg > g');
                    const fullId = firstGroup ? firstGroup.id : '';

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
                }

                function toggleChemLayer() {
                    const chemLayers = el.querySelectorAll(".chem-layer");

                    for (const chemLayer of chemLayers) {
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

                    if (mobile) {
                        revealCentroids(activeChemicalId);
                    }
                }

                function toggleBodyLayer(diseaseId) {
                    for (const { layerEl } of bodyLayers.values()) {
                        layerEl.classList.remove('is-active');
                    }

                    const entry = bodyLayers.get(diseaseId);
                    if (!entry) {
                        console.warn(`No body layer found for disease ID: ${diseaseId}`, bodyLayers);
                        return;
                    }

                    entry.layerEl.classList.add('is-active');

                    revealDots(activeDiseaseId);
                }

                async function initBodyLayers() {
                    const jobs = [];

                    for (let i = 0; i <= 8; i++) {
                        const path = `${assetsPath}body-layer-${i}.svg`;
                        jobs.push(fetchAndProcessBodyLayer(path));
                    }

                    await Promise.all(jobs).catch(console.error);
                }

                async function initChemLayers() {
                    const jobs = [];

                    for (let i = 0; i <= 5; i++) {
                        const cpath = `${assetsPath}chemicals-${i}.svg`;
                        jobs.push(fetchAndProcessChemLayer(cpath))
                    }

                    await Promise.all(jobs).catch(console.error);
                }

                // Dots
                function getSVGPoint(layerSvg, evt) {
                    const pt = layerSvg.createSVGPoint();
                    pt.x = evt.clientX;
                    pt.y = evt.clientY;
                    return pt.matrixTransform(layerSvg.getScreenCTM().inverse());
                }

                function resetDotColors() {
                    _dots.forEach(dot => {
                        dot.setAttribute('fill', 'black')
                    });
                }

                function highlightDots(nearestCentroid) {
                    activeCentroid = nearestCentroid;

                    let id = -1;

                    if (activeDiseaseId != null) {
                        id = activeDiseaseId
                    } else if (activeChemicalId != null) {
                        id = activeChemicalId
                    } else {
                        return
                    }


                    const { cx: sx, cy: sy } = findCentroidCenter(nearestCentroid);
                    const key = `${id}-${activeCentroid.dataset.index}`;

                    const label = centroidToLabels.get(key);
                    let filteredPalette = ['#000000'];

                    if (label) {
                        const chemPills = Array.from(label.querySelectorAll('[id^="B_"]'));
                        const activeColors = chemPills
                            .map(chem => {
                                const rawId = chem.id
                                    .replace(/^B_/, '')
                                    .replace(/_\d+$/, '')
                                    .toUpperCase();
                                const chemicalName = chemicalLookup[rawId];

                                if (chemicalName) {
                                    return getButtonColor(chem);
                                }
                                return null;
                            })
                            .filter(color => color !== null);

                        if (activeColors.length > 0) {
                            filteredPalette = [...new Set(activeColors)];
                        }
                    }

                    _dots.forEach(dot => {
                        const cx = parseFloat(dot.getAttribute('cx'));
                        const cy = parseFloat(dot.getAttribute('cy'));
                        const dist = Math.hypot(cx - sx, cy - sy);

                        if (dist <= CENTROID_RADIUS) {
                            const seed = parseFloat(dot.dataset.colorSeed) || Math.random();
                            const pick = (filteredPalette.length === 1)
                                ? filteredPalette[0]
                                : filteredPalette[Math.floor(seed * filteredPalette.length) % filteredPalette.length];
                            dot.setAttribute('fill', pick);
                        } else {
                            dot.setAttribute('fill', 'black');
                        }
                    });
                }

                function revealDots(id) {
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
                }

                function initCentroids(layerSvg, id) {
                    let ct = layerSvg.querySelectorAll('#centroids > circle');

                    if (ct.length == 0) {
                        ct = layerSvg.querySelectorAll('#centroids > path')
                    }

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
                                const rawId = pill.id
                                    .replace(/^B_/, '')
                                    .replace(/_\d+$/, '')
                                    .toUpperCase();
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
                }

                function getLabelText(label) {
                    const firstPath = label.querySelector('path');
                    if (firstPath && firstPath.id) {
                        return firstPath.id.replace(/_/g, ' ');
                    } else {
                        const firstGroup = label.querySelector('g');
                        return firstGroup.id.replace(/_/g, ' ');
                    }
                    return '';
                }

                function revealCentroids(id) {
                    const overlay = el.querySelector("#centroid-overlay");
                    const popup = el.querySelector("#centroid-label-popup");
                    overlay.innerHTML = '';
                    popup.classList.remove('visible');
                    popup.textContent = '';
                    _dots.forEach(dot => dot.style.opacity = '');

                    if (!id) return;

                    const color = chemicalColors[id] || '#152B29';
                    const centroids = layerIdToCentroids.get(id) || [];

                    const vb = dotsSvgEl.getAttribute('viewBox');
                    if (vb) overlay.setAttribute('viewBox', vb);
                    overlay.setAttribute('preserveAspectRatio', dotsSvgEl.getAttribute('preserveAspectRatio') || 'xMidYMid meet');

                    centroids.forEach((centroid, i) => {
                        const { cx, cy } = findCentroidCenter(centroid);
                        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        circle.setAttribute("cx", cx);
                        circle.setAttribute("cy", cy);
                        circle.setAttribute("r", CENTROID_RADIUS * 0.5);
                        circle.setAttribute("fill", "none");
                        circle.setAttribute("stroke", color);
                        circle.setAttribute("stroke-width", "3");
                        circle.style.opacity = "0";
                        circle.style.pointerEvents = "all";
                        circle.style.cursor = "pointer";
                        overlay.appendChild(circle);

                        setTimeout(() => {
                            circle.style.opacity = "1";
                        }, i * 80);

                        circle.addEventListener('click', (e) => {
                            e.stopPropagation();

                            overlay.querySelectorAll('circle').forEach(c => {
                                c.style.opacity = c === circle ? '1' : '0.4';
                            });

                            _dots.forEach(dot => dot.style.opacity = '');
                            const { cx: scx, cy: scy } = findCentroidCenter(centroid);
                            _dots.forEach(dot => {
                                const dist = Math.hypot(dot._cx - scx, dot._cy - scy);
                                if (dist > CENTROID_RADIUS) dot.style.opacity = '0.2';
                            });

                            const key = `${id}-${centroid.dataset.index}`;
                            const label = centroidToLabels.get(key);
                            if (!label) return;

                            const labelText = getLabelText(label);

                            const pills = Array.from(label.querySelectorAll('[id^="B_"]')).filter(pill => {
                                const rawId = pill.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase();
                                return chemicalLookup[rawId];
                            });
                            const pillColors = pills.map(pill => ({
                                name: chemicalLookup[pill.id.replace(/^B_/, '').replace(/_\d+$/, '').toUpperCase()],
                                color: getButtonColor(pill)
                            }));

                            const pt = dotsSvgEl.createSVGPoint();
                            pt.x = cx;
                            pt.y = cy;
                            const screenPt = pt.matrixTransform(dotsSvgEl.getScreenCTM());

                            const pillsHtml = pillColors.map(p => {
                                const formattedName = p.name.toLowerCase().replace(' ', '_');
                                return `<span class="popup-pill" data-chemical-link="${formattedName}" style="background:${p.color}; cursor:pointer;">${p.name}</span>`;
                            }).join('');

                            popup.classList.remove('visible');
                            popup.innerHTML = `<div class="popup-label">${labelText}</div><div class="popup-pills">${pillsHtml}</div>`;
                            popup.style.left = `${screenPt.x}px`;
                            popup.style.top = `${screenPt.y + CENTROID_RADIUS + 16}px`;

                            popup.querySelectorAll('.popup-pill').forEach(pillNode => {
                                pillNode.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const chemTarget = pillNode.getAttribute('data-chemical-link');
                                    const targetAccordion = document.querySelector(`.chemical-accordion[data-chemical="${chemTarget}"]`);

                                    if (targetAccordion) {
                                        const toggle = targetAccordion.querySelector('.js-chemical-accordion-toggle');
                                        if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
                                            toggle.click();
                                        }
                                        setTimeout(() => {
                                            const topOffset = targetAccordion.getBoundingClientRect().top + window.pageYOffset - 120;
                                            window.scrollTo({
                                                top: topOffset,
                                                behavior: 'smooth'
                                            });
                                        }, 150);
                                    }
                                });
                            });

                            popup.offsetHeight;

                            popup.classList.add('visible');
                        });
                    });
                }


                async function initDots() {
                    const svgText = await fetch(assetsPath + 'body-dots.svg').then(r => r.text());

                    bodyDotsWrapper.innerHTML = svgText;
                    dotsSvgEl = bodyDotsWrapper.querySelector("svg")

                    if (mobile) {
                        const focusW = 1920 * 0.325;
                        const focusH = focusW * (window.innerHeight / window.innerWidth);
                        const focusX = (1920 - focusW) / 2;
                        const focusY = (1080 - focusH) / 2;

                        dotsSvgEl.setAttribute('width', `${window.innerWidth}px`);
                        dotsSvgEl.setAttribute('height', `${window.innerHeight}px`);
                        dotsSvgEl.setAttribute('viewBox', `${focusX} ${focusY + 150} ${focusW} ${focusH}`);
                    }

                    if (!tempPoint) {
                        tempPoint = dotsSvgEl.createSVGPoint();
                    }

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

                        if (!dot.dataset.colorSeed) {
                            dot.dataset.colorSeed = String(Math.random());
                        }

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
                            })

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
                        })
                    });


                    return dots;
                }


                // Labels and Pills
                function getIndex(id) {
                    const m = id && id.match(/(\d+)/);
                    return m ? m[1] : null;
                };

                function getLabelsForCentroid(id, centroid) {
                    const idx = centroid.dataset.index;
                    return centroidToLabels.get(`${id}-${idx}`) || null;
                }

                function getButtonColor(buttonGroup) {
                    let rect = buttonGroup.querySelector('rect');

                    if (!rect) {
                        rect = buttonGroup.querySelector('[id^="Rectangle"]');
                    }

                    if (rect) {
                        const cs = window.getComputedStyle(rect);
                        if (cs && cs.fill && cs.fill !== 'none') {
                            return cs.fill;
                        }
                        const a = rect.getAttribute('fill');

                        if (a && a !== 'none') return a;
                    }

                    const csG = window.getComputedStyle(buttonGroup);
                    if (csG && csG.fill && csG.fill !== 'none') return csG.fill;
                    return buttonGroup.getAttribute('fill') || '#000000';
                }

                function toggleLabels(allCentroids, nearestCentroid) {
                    const activeId = activeDiseaseId || activeChemicalId;

                    const nearestLabel = nearestCentroid
                        ? getLabelsForCentroid(activeId, nearestCentroid)
                        : null;

                    const otherLabels = allCentroids
                        .filter(c => c !== nearestCentroid)
                        .map(c => getLabelsForCentroid(activeId, c))
                        .filter(Boolean);

                    otherLabels.forEach(lab => {
                        lab.classList.add("inactive")

                        const segs = lab._lines || [];
                        segs.forEach(seg => {
                            const len = parseFloat(seg.dataset.pathLen) || 0;
                            seg.style.strokeDashoffset = len;
                        });
                    })

                    if (nearestLabel) {
                        nearestLabel.classList.remove("inactive")

                        const segs = nearestLabel._lines || [];
                        segs.forEach(seg => seg.style.strokeDashoffset = 0);
                    }
                }

                function resetLabels(centroids) {
                    centroids.forEach(centroid => {
                        const label = getLabelsForCentroid(activeDiseaseId || activeChemicalId, centroid);

                        if (label) {
                            const chemPills = Array.from(label.querySelectorAll('[id^="B_"]'));

                            let shouldBeVisible = chemPills.length === 0;

                            chemPills.forEach((chem) => {
                                const rawId = chem.id
                                    .replace(/^B_/, '')
                                    .replace(/_\d+$/, '')
                                    .toUpperCase();

                                const chemicalName = chemicalLookup[rawId];

                                if (chemicalName) {
                                    shouldBeVisible = true;
                                }
                            });

                            if (shouldBeVisible) {
                                label.classList.remove("inactive")
                            } else {
                                label.classList.add("inactive")
                            }
                        }
                    })
                }

                function initLabelsAndPills(layerSvg) {
                    const labels = Array.from(layerSvg.querySelectorAll('[id*="_TEXT"]'))

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
                            const rawId = pill.id
                                .replace(/^B_/, '')
                                .replace(/_\d+$/, '')
                                .toUpperCase();

                            const chemicalName = chemicalLookup[rawId];

                            if (chemicalName) {
                                pill.addEventListener('click', () => {
                                    handlePillClick(chemicalName);
                                })
                            } else {
                                pill.style.display = 'none';
                            }
                        })

                    });
                }


                // Menu items
                function updateMenuItemCircles() {
                    const allCircles = menuItemsSvgEl.querySelectorAll('[id^="C_D"]');

                    allCircles.forEach(circle => {
                        const diseaseId = circle.id.replace('C_', '');
                        const menuItem = menuItemsSvgEl.querySelector(`#${diseaseId}`);

                        if (diseaseId === activeDiseaseId) {
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
                }

                function associateMenuItems() {
                    const menuItems = el.querySelectorAll(".menu-item");

                    for (const menuItem of menuItems) {
                        const id = menuItem.id

                        const labels = Array.from(centroidToLabels.entries())
                            .filter(([key, value]) => key.startsWith(`${id}-`))
                            .map(([key, value]) => value);

                        let hasValidChemicals = false;

                        labels.forEach((lbl) => {
                            const chemPills = Array.from(lbl.querySelectorAll('[id^="B_"]'));

                            chemPills.forEach((chem) => {
                                const rawId = chem.id
                                    .replace(/^B_/, '')
                                    .replace(/_\d+$/, '')
                                    .toUpperCase();

                                const chemicalName = chemicalLookup[rawId];

                                if (chemicalName) {
                                    hasValidChemicals = true;

                                    if (!chemicalsToMenuItems.has(chemicalName)) {
                                        const set = new Set()
                                        set.add(id);
                                        chemicalsToMenuItems.set(chemicalName, set)
                                    } else {
                                        chemicalsToMenuItems.get(chemicalName).add(id)
                                    }
                                }
                            })
                        })

                        if (!hasValidChemicals) {
                            menuItem.style.display = 'none';

                            const smallCircle = menuItem.parentElement.querySelector(`#C_${id}`);
                            if (smallCircle) {
                                smallCircle.style.display = 'none';
                            }
                        }
                    }

                    if (mobile) {
                        const list = el.querySelector("#menu-items-list");
                        if (!list) return;

                        const validDiseaseIds = [...new Set(
                            Array.from(centroidToLabels.keys())
                                .map(key => key.split('-')[0])
                                .filter(id => id.startsWith('D'))
                        )];

                        list.innerHTML = validDiseaseIds.map(id => {
                            const layerDiv = el.querySelector("#" + id);
                            const name = (layerDiv && layerDiv.dataset.disease) ? layerDiv.dataset.disease : id;
                            return `<li data-disease="${id}" data-label="${name}">${name}</li>`;
                        }).join('');

                        list.querySelectorAll("li").forEach(li => {
                            li.addEventListener("click", () => {
                                const trigger = el.querySelector("#menu-items-trigger");
                                applyMarqueeSingle(trigger, li.dataset.label);
                                const existing = el.querySelector("#menu-items-reset-mobile");
                                if (existing) existing.remove();
                                const wrapper = el.querySelector("#menu-items-mobile");
                                const resetBtn = document.createElement('button');
                                resetBtn.id = 'menu-items-reset-mobile';
                                resetBtn.textContent = '✕';
                                wrapper.appendChild(resetBtn);
                                resetBtn.addEventListener('click', (e) => {
                                    trigger.style.paddingRight = '90px';
                                    e.stopPropagation();
                                    resetDiseaseMobile();
                                });
                                list.classList.remove("open");
                                selectDisease(li.dataset.disease);
                            });
                        });

                    }
                }

                function toggleMenuItem(diseaseId) {
                    const allDiseaseGroups = menuItemsSvgEl.querySelectorAll('[id^="D"]');

                    allDiseaseGroups.forEach(group => {
                        const ellipse = group.querySelector('[id*="Ellipse"]');
                        if (ellipse) {
                            if (group.id === diseaseId) {
                                ellipse.classList.remove('inactive');
                            } else {
                                ellipse.classList.add('inactive');
                            }
                        }
                    });

                    updateMenuItemCircles();
                }

                async function initMenuItems() {

                    if (mobile) {
                        const trigger = el.querySelector("#menu-items-trigger");
                        const list = el.querySelector("#menu-items-list");

                        let marqueeActive = false;
                        trigger.addEventListener("click", () => {
                            list.classList.toggle("open");
                            if (!marqueeActive) {
                                requestAnimationFrame(() => {
                                    applyMarquee(list);
                                    marqueeActive = true;
                                });
                            }
                        });

                        document.addEventListener("click", (e) => {
                            if (!e.target.closest("#menu-items-mobile")) {
                                list.classList.remove("open");
                            }
                        });
                    } else {
                        const svgText = await fetch(assetsPath + "menu-items.svg").then(r => r.text());

                        document.getElementById("menu-items-wrapper").innerHTML = svgText;
                        menuItemsSvgEl = document.querySelector(`#menu-items-wrapper svg`)

                        const menuItems = Array.from(menuItemsSvgEl.querySelectorAll('[id^="D"]'));
                        const menuItemSmallCircles = Array.from(menuItemsSvgEl.querySelectorAll('[id^="C_D"]'));

                        menuItems.forEach(el =>
                            el.classList.add('menu-item')
                        );

                        menuItemSmallCircles.forEach(el => {
                            el.classList.add('menu-item-inactive')
                        });

                        menuItems.forEach(el => {
                            el.addEventListener('click', () => {
                                selectDisease(el.id);
                            })
                        });
                    }


                }


                // Event handlers
                function handleMouseMove(evt) {
                    const p = getSVGPoint(dotsSvgEl, evt);
                    mouse.x = p.x;
                    mouse.y = p.y;
                }

                function addListeners() {
                    window.addEventListener('mousemove', (e) => handleMouseMove(e), { passive: false })
                }

                function handlePillClick(chemicalId) {
                    /* your interaction code here */

                    console.log(`clicked ${chemicalId}`)
                }


                // Utilities
                function sanitizeId(id) {
                    return id
                        .replace(/^ASSET ANIMATION D\d+\s+/, '')
                        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                        .replace(/^ASSET ANIMATION D\d+\s+/, '')
                        .trim()
                        .replace(/[^\w\s&-]/g, '');
                }

                function diseaseId(fullId) {
                    const match = fullId.match(/(D\d+)/);
                    return match ? match[1] : undefined;
                }

                function selectDisease(id) {
                    if (mobile && activeChemicalId != null) {
                        const chemTrigger = el.querySelector("#dropup-trigger");
                        chemTrigger.textContent = "Chemicals";
                        chemTrigger.classList.remove('overflowing');
                        chemTrigger.style.backgroundColor = '';
                        chemTrigger.style.color = '';
                        const existingReset = el.querySelector("#filter-reset-mobile");
                        if (existingReset) existingReset.remove();
                        activeChemicalId = null;
                        toggleChemLayer();
                    }

                    activeDiseaseId = id;

                    if (!mobile) {
                        toggleMenuItem(id);
                        toggleBodyLayer(id);
                    } else {
                        revealDots(id);
                        revealCentroids(id);
                    }
                }

                function findCentroidCenter(centroid) {
                    let cx, cy;

                    cx = parseFloat(centroid.getAttribute('cx'));
                    cy = parseFloat(centroid.getAttribute('cy'));

                    if (isNaN(cx) || isNaN(cy)) {
                        const bbox = centroid.getBBox();
                        cx = bbox.x + bbox.width / 2;
                        cy = bbox.y + bbox.height / 2;
                    }

                    return { cx: cx, cy: cy }
                }

                function applyMarquee(list) {
                    list.querySelectorAll('li').forEach(li => {
                        const text = li.dataset.label || li.textContent.trim();
                        li.innerHTML = `<span>${text}</span>`;

                        const span = li.querySelector('span');
                        const liStyle = window.getComputedStyle(li);
                        const paddingLeft = parseFloat(liStyle.paddingLeft) || 0;
                        const paddingRight = parseFloat(liStyle.paddingRight) || 0;
                        const availableWidth = li.clientWidth - paddingLeft - paddingRight;
                        const overflow = span.scrollWidth - availableWidth;

                        if (overflow > 0) {
                            li.classList.add('overflowing');
                            li.style.setProperty('--marquee-offset', `-${overflow / 1.5}px`);
                            li.style.setProperty('--marquee-start', `${overflow / 2}px`);
                        }
                    });
                }

                function applyMarqueeSingle(el, text) {
                    el.innerHTML = `<span>${text}</span>`;
                    const span = el.querySelector('span');
                    const elStyle = window.getComputedStyle(el);
                    const paddingLeft = parseFloat(elStyle.paddingLeft) || 0;
                    const paddingRight = parseFloat(elStyle.paddingRight) || 0;

                    const parent = el.parentElement;
                    const resetBtn = parent ? parent.querySelector('#filter-reset-mobile, #menu-items-reset-mobile') : null;
                    const resetBtnWidth = resetBtn ? resetBtn.offsetWidth + 20 : 0;

                    const availableWidth = el.clientWidth - paddingLeft - paddingRight - resetBtnWidth;
                    const overflow = span.scrollWidth - availableWidth;

                    if (overflow > 0) {
                        el.classList.add('overflowing');
                        el.style.setProperty('--marquee-offset', `-${overflow / 1.5}px`);
                        el.style.setProperty('--marquee-start', `${overflow / 2}px`);
                    } else {
                        el.classList.remove('overflowing');
                        span.style.width = '100%';
                        span.style.textAlign = 'center';
                    }
                }

                function resetDiseaseMobile() {
                    const trigger = el.querySelector("#menu-items-trigger");
                    trigger.textContent = "Health effects";
                    trigger.classList.remove('overflowing');
                    trigger.style.backgroundColor = '';
                    trigger.style.removeProperty('--marquee-offset');
                    trigger.style.removeProperty('--marquee-start');
                    trigger.style.paddingRight = ''
                    _dots.forEach(dot => dot.style.opacity = '');
                    revealCentroids(null);
                    revealDots(null);
                    activeDiseaseId = null;

                    const existingReset = el.querySelector("#menu-items-reset-mobile");
                    if (existingReset) existingReset.remove();
                }

                // Render
                function render() {
                    rafId = null;

                    const diseaseCentroids = layerIdToCentroids.get(activeDiseaseId);
                    const chemicalCentroids = layerIdToCentroids.get(activeChemicalId);

                    let nearestCentroid = null;
                    let minDist = Infinity;

                    _dots.forEach(dot => {
                        const cx = dot._cx;
                        const cy = dot._cy;

                        const baseR = parseFloat(dot.dataset.baseR);
                        let targetR = baseR;

                        if (activeDiseaseId) {
                            const val = parseFloat(dot.dataset[`targetR${activeDiseaseId}`]);
                            if (!isNaN(val)) targetR = val;
                        } else if (activeChemicalId) {
                            const val = parseFloat(dot.dataset[`targetR${activeChemicalId}`]);
                            if (!isNaN(val)) targetR = val;
                        }

                        const currentBase = parseFloat(dot.dataset.currentBase) || targetR;

                        const dist = Math.hypot(cx - mouse.x, cy - mouse.y);

                        let factor = 1;
                        if (dist < MAX_HALO_DIST) {
                            const t = 1 - dist / MAX_HALO_DIST;
                            factor = 1 + t * (MAX_HALO_GROW_FACTOR - 1);
                        }

                        dot.setAttribute('r', currentBase * factor);
                    });

                    function assignNearest(centroids) {
                        centroids.forEach(centroid => {
                            let { cx, cy } = findCentroidCenter(centroid);

                            const dist = Math.hypot(cx - mouse.x, cy - mouse.y);

                            if (dist < CENTROID_RADIUS && dist < minDist) {
                                minDist = dist;
                                nearestCentroid = centroid;
                            }
                        });
                    }

                    if (diseaseCentroids) {
                        assignNearest(diseaseCentroids)
                    } else if (chemicalCentroids) {
                        assignNearest(chemicalCentroids)
                    }

                    resetDotColors();

                    if (nearestCentroid != null) {
                        highlightDots(nearestCentroid)

                        if (!mobile) {
                            if (activeDiseaseId != null) {
                                toggleLabels(diseaseCentroids, nearestCentroid)
                            } else if (activeChemicalId != null) {
                                toggleLabels(chemicalCentroids, nearestCentroid)
                            }
                        }
                    } else {
                        if (!mobile) {
                            if (activeDiseaseId != null) {
                                resetLabels(diseaseCentroids)
                            } else if (activeChemicalId != null) {
                                resetLabels(chemicalCentroids)
                            }
                        }
                    }
                }

                function requestRender(timestamp = 0) {
                    const elapsed = timestamp - lastFrameTime;

                    if (elapsed >= FRAME_INTERVAL) {
                        lastFrameTime = timestamp;
                        render();
                    }

                    requestAnimationFrame(requestRender);
                }
                // ============================================




                async function init() {

                    if (window.innerWidth / window.innerHeight < 0.75) {
                        mobile = true;
                        document.body.classList.add("mobile");
                    }

                    if (!mobile) {
                        await initMenuItems();
                        await initBodyLayers();
                        await initChemLayers();


                        bodyLayers.forEach((bodyLayer, diseaseId) => {
                            const { layerSvg } = bodyLayer;

                            initLabelsAndPills(layerSvg);
                            initCentroids(layerSvg, diseaseId);
                        });

                        chemLayers.forEach((chemLayer, chemId) => {
                            const { layerSvg } = chemLayer;

                            initLabelsAndPills(layerSvg);
                            initCentroids(layerSvg, chemId);
                        });
                    } else {
                        await initMenuItems();
                        await initChemLayers();
                        await initBodyLayers();

                        bodyLayers.forEach((bodyLayer, diseaseId) => {
                            const { layerSvg } = bodyLayer;
                            initCentroids(layerSvg, diseaseId);
                        });

                        chemLayers.forEach((chemLayer, chemId) => {
                            const { layerSvg } = chemLayer;
                            initCentroids(layerSvg, chemId);
                            layerSvg.querySelectorAll('[id*="_TEXT"]').forEach(lbl => {
                                lbl.style.display = 'none';
                            });
                        });
                    }

                    await initDots();
                    revealDots(null);

                    initFilter();
                    associateMenuItems();
                    addListeners();

                    requestAnimationFrame(requestRender)
                }


                init();
            });
        }
    };
})(Drupal, once);