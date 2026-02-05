/**
 * @file
 * Chemical health effects component logic.
 */

((Drupal, once) => {
  Drupal.behaviors.chemicalHealthEffects = {
    attach(context) {
      const elements = once('chemical-health-effects', '.js-chemical-health-effects', context);
      let revealing = false

      elements.forEach((el) => {
        const svg = el.querySelector('svg');
        if (!svg) return;

        const cfg = {
          baseFill: el.dataset.baseFill || '#FFCBD4',
          hoverFill: el.dataset.hoverFill || '#9B352A',
          background: el.dataset.background || '#E45C4D'
        };

        const dots = Array.from(svg.querySelectorAll('circle'));
        const specialDots = Array.from(svg.querySelectorAll('circle[id$="_DOT"]'));
        const labels = Array.from(svg.querySelectorAll('[id$="_TEXT"]'));

        if (!dots.length) return;

        const getIndex = id => {
          const m = id && id.match(/(\d+)/);
          return m ? m[1] : null;
        };

        const dotByIndex = {};
        specialDots.forEach(dot => {
          const idx = getIndex(dot.id);
          dot.dataset.index = idx;
          if (idx != null) dotByIndex[idx] = dot;
        });

        labels.forEach(lbl => {
          const idx = getIndex(lbl.id);
          lbl.dataset.index = idx;
          lbl.style.opacity = 0;

          const refDot = idx != null ? dotByIndex[idx] : null;
          const segs = Array.from(lbl.querySelectorAll('line, path, polyline, polygon'));

          if (refDot) {
            const dotX = parseFloat(refDot.getAttribute('cx'));
            const dotY = parseFloat(refDot.getAttribute('cy'));

            segs.forEach(seg => {
              if (seg.tagName.toLowerCase() === 'line') {
                let x1 = parseFloat(seg.getAttribute('x1'));
                let y1 = parseFloat(seg.getAttribute('y1'));
                let x2 = parseFloat(seg.getAttribute('x2'));
                let y2 = parseFloat(seg.getAttribute('y2'));

                const d1 = Math.hypot(x1 - dotX, y1 - dotY);
                const d2 = Math.hypot(x2 - dotX, y2 - dotY);

                if (d1 > d2) {
                  seg.setAttribute('x1', x2);
                  seg.setAttribute('y1', y2);
                  seg.setAttribute('x2', x1);
                  seg.setAttribute('y2', y1);
                }
              }
            });
          }

          lbl._lines = segs;
          segs.forEach(seg => {
            if (!seg.getTotalLength) return;
            const len = seg.getTotalLength();
            seg.dataset.pathLen = String(len);
            seg.style.strokeDasharray = len;
            seg.style.strokeDashoffset = len;
          });
        });

        dots.forEach(dot => {
          const r = parseFloat(dot.getAttribute('r')) || 2;
          dot.dataset.baseR = r;
          dot.dataset.baseFill = cfg.baseFill;
          dot.setAttribute('fill', cfg.baseFill);
        });

        dots.forEach(dot => {
          const r = parseFloat(dot.getAttribute('r')) || 2;
          dot.dataset.baseR = r;
          dot.dataset.baseFill = cfg.baseFill || '#722E27';
        });

        const haloRadius    = cfg.haloRadius    ?? 40;
        const haloFactorMax = cfg.haloFactorMax ?? 2.1;

        dots.forEach(dot => {
          let factor = 1;
          const cx = parseFloat(dot.getAttribute('cx'));
          const cy = parseFloat(dot.getAttribute('cy'));

          specialDots.forEach(sDot => {
            const sx = parseFloat(sDot.getAttribute('cx'));
            const sy = parseFloat(sDot.getAttribute('cy'));
            const dx = cx - sx;
            const dy = cy - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < haloRadius) {
              const t = 1 - dist / haloRadius;
              const f = 1 + t * (haloFactorMax - 1);
              factor = Math.max(factor, f);
            }
          });

          const baseR = parseFloat(dot.dataset.baseR);
          dot.dataset.baseR = baseR * factor;
        });

        let mouse = {x: 0, y: 0, inside: false};
        let rafId = null;
        let activeSpecial = null;

        const maxDist            = cfg.maxDist     ?? 100;
        const maxFactor          = cfg.maxFactor   ?? 1.8;
        const colorRadius        = cfg.colorRadius ?? 40;
        const specialHoverRadius = colorRadius;

        function getSVGPoint(evt) {
          const pt = svg.createSVGPoint();
          pt.x = evt.clientX;
          pt.y = evt.clientY;
          return pt.matrixTransform(svg.getScreenCTM().inverse());
        }

        svg.addEventListener('mousemove', e => {
          if (revealing) {
            return;
          }
          mouse.inside = true;
          const p = getSVGPoint(e);
          mouse.x = p.x;
          mouse.y = p.y;
          requestRender();
        });

        svg.addEventListener('mouseleave', () => {
          if (revealing) {
            return;
          }

          mouse.inside = false;
          resetHover();
          setActiveSpecial(null);
        });

        function requestRender() {
          if (rafId) return;
          rafId = requestAnimationFrame(render);
        }

        function render() {
          rafId = null;

          let closestSpecial = null;
          let minDist = Infinity;

          dots.forEach(dot => {
            const cx = parseFloat(dot.getAttribute('cx'));
            const cy = parseFloat(dot.getAttribute('cy'));
            const baseR = parseFloat(dot.dataset.baseR);

            let factor = 1;
            let dist = Infinity;

            if (mouse.inside) {
              const dx = cx - mouse.x;
              const dy = cy - mouse.y;
              dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < maxDist) {
                const t = 1 - dist / maxDist;
                factor = 1 + t * (maxFactor - 1);
              }
            }

            dot.setAttribute('r', baseR * factor);

            if (mouse.inside && specialDots.includes(dot)) {
              if (dist < specialHoverRadius && dist < minDist) {
                minDist = dist;
                closestSpecial = dot;
              }
            }
          });

          setActiveSpecial(closestSpecial);
        }

        function resetHover() {
          dots.forEach(dot => {
            const baseR = parseFloat(dot.dataset.baseR);
            dot.setAttribute('r', baseR);
          });
        }

        function setActiveSpecial(dot) {
          if (dot === activeSpecial) return;
          activeSpecial = dot;

          dots.forEach(d => d.setAttribute('fill', cfg.baseFill || '#722E27'));

          if (!dot) {
            showAllLabels();
            return;
          }

          const sx = parseFloat(dot.getAttribute('cx'));
          const sy = parseFloat(dot.getAttribute('cy'));

          dots.forEach(d => {
            const cx = parseFloat(d.getAttribute('cx'));
            const cy = parseFloat(d.getAttribute('cy'));
            const dx = cx - sx;
            const dy = cy - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= colorRadius) {
              d.setAttribute('fill', cfg.hoverFill || '#491D18');
            }
          });

          const idx = dot.dataset.index;
          if (idx != null) {
            showOnlyLabel(idx);
          } else {
            showAllLabels();
          }
        }

        function showAllLabels() {
          labels.forEach(lbl => {
            lbl.style.opacity = 1;
            const segs = lbl._lines || [];
            segs.forEach(seg => {
              seg.style.strokeDashoffset = 0;
            });
          });
        }

        function showOnlyLabel(index) {
          labels.forEach(lbl => {
            const segs = lbl._lines || [];
            if (lbl.dataset.index === index) {
              lbl.style.opacity = 1;
              segs.forEach(seg => {
                seg.style.strokeDashoffset = 0;
              });
            } else {
              lbl.style.opacity = 0;
              segs.forEach(seg => {
                const len = parseFloat(seg.dataset.pathLen) || 0;
                seg.style.strokeDashoffset = len;
              });
            }
          });
        }

        // Store functions on svg for later use
        svg._showAllLabels = showAllLabels;
        svg._dots = dots;
        svg._labels = labels;

        // Initial Reveal Animation
        function initialReveal() {
          const shuffled = dots.slice().sort(() => Math.random() - 0.5);
          shuffled.forEach((dot, i) => {
            const baseR = parseFloat(dot.dataset.baseR);
            dot.setAttribute('r', 0);
            setTimeout(() => {
              dot.setAttribute('r', baseR);
            }, i * 5);
          });

          const totalDuration = dots.length * 5 + 200;
          revealing = true;
          setTimeout(() => {
            showAllLabels();
            revealing = false;
          }, totalDuration);
        }

        initialReveal();
      });
    },
  };
})(Drupal, once);
