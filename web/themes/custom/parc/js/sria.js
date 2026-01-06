(function (Drupal, once) {

  Drupal.behaviors.scrambleText = {
    attach(context) {

      once('scramble-text', '#final-layer', context).forEach(() => {

        const baseText = `STRATEGIC
RESEARCH & 
INNOVATION
AGENDA
SYNERGYES`.trim();

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        const COLORS = [
          "#AED3FF",
          "#6DCEBC",
          "#6DCEBC",
          "#E6CD7E",
          "#ECD1D6",
          "#D3C0E9"
        ];

        const FPS   = 30;
        const STEP  = 800 / FPS;
        const STEPS = 50;
        const LAST_ROW_DURATION = 7000;
        const LAST_ROW_STOP = LAST_ROW_DURATION / 40000;

        const trailLayer    = document.getElementById("trail-layer");
        const scrambleLayer = document.getElementById("scramble-layer");
        const finalLayer    = document.getElementById("final-layer");

        if (!trailLayer || !scrambleLayer || !finalLayer) {
          return;
        }

        const lastLineStart = baseText.lastIndexOf("\n") + 1;

        function isLastRowIndex(i) {
          return i >= lastLineStart && baseText[i] !== "\n" && baseText[i] !== " ";
        }

        const locked     = new Array(baseText.length).fill(false);
        const finalSpans = [];

        function easeInOutQuad(t) {
          return t < 0.5
            ? 2 * t * t
            : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        function randomChar() {
          return chars[Math.floor(Math.random() * chars.length)];
        }

        function randomColor() {
          return COLORS[Math.floor(Math.random() * COLORS.length)];
        }

        function buildFinalLayer() {
          let html = "";

          for (let i = 0; i < baseText.length; i++) {
            const t = baseText[i];

            if (t === "\n") {
              html += "<br>";
              continue;
            }
            if (t === " ") {
              html += " ";
              continue;
            }

            if (isLastRowIndex(i)) {
              html += `<span class="last-row">${t}</span>`;
              continue;
            }

            html += `<span class="final-letter" data-idx="${i}">${t}</span>`;
          }

          finalLayer.innerHTML = html;

          finalLayer.querySelectorAll(".final-letter").forEach(span => {
            const idx = Number(span.getAttribute("data-idx"));
            finalSpans[idx] = span;
          });
        }

        function buildScrambleFrame(progress) {
          const eased = easeInOutQuad(progress);
          let html = "";

          for (let i = 0; i < baseText.length; i++) {
            const t = baseText[i];

            if (t === "\n") {
              html += "<br>";
              continue;
            }
            if (t === " ") {
              html += " ";
              continue;
            }

            if (isLastRowIndex(i)) {
              if (progress > LAST_ROW_STOP) {
                html += " ";
              } else {
                html += `<span style="color:${randomColor()}">${randomChar()}</span>`;
              }
              continue;
            }

            if (locked[i]) {
              html += " ";
              continue;
            }

            let ch = randomChar();

            if (ch === t || Math.random() < eased * 0.15) {
              locked[i] = true;
            }

            html += `<span style="color:${randomColor()}">${ch}</span>`;
          }

          return html;
        }

        function updateFinalVisibility() {
          for (let i = 0; i < baseText.length; i++) {
            const t = baseText[i];
            if (t === "\n" || t === " " || isLastRowIndex(i)) continue;

            const span = finalSpans[i];
            if (span) {
              span.style.opacity = locked[i] ? 1 : 0;
            }
          }
        }

        function addTrail(html) {
          const frame = document.createElement("div");
          frame.className = "trail-frame";
          frame.innerHTML = html;
          trailLayer.appendChild(frame);
        }

        function animate() {
          buildFinalLayer();

          let step = 0;

          const interval = setInterval(() => {
            const progress = Math.min(step / STEPS, 1);

            if (progress < 1) {
              const frameHtml = buildScrambleFrame(progress);
              scrambleLayer.innerHTML = frameHtml;
              addTrail(frameHtml);
              updateFinalVisibility();
            } else {
              for (let i = 0; i < baseText.length; i++) {
                if (baseText[i] !== "\n" && baseText[i] !== " " && !isLastRowIndex(i)) {
                  locked[i] = true;
                }
              }
              updateFinalVisibility();
              scrambleLayer.innerHTML = "";
              clearInterval(interval);
            }

            step++;
          }, STEP);
        }

        animate();

      });

    }
  };

})(Drupal, once);
