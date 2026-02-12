((Drupal, once) => {
    Drupal.behaviors.sriaAnimation = {
        attach(context) {
            const elements = once('sria-animation', '.sria-animation', context);

            elements.forEach((el) => {
                const baseText = `STRATEGIC
RESEARCH &
INNOVATION
AGENDA
SYNERGIES`.trim();

                // Scramble
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

                const COLORS = [
                    "#AED3FF",
                    "#6DCEBC",
                    "#6DCEBC",
                    "#E6CD7E",
                    "#ECD1D6",
                    "#D3C0E9"
                ];

                const DURATION = 40000;
                const FPS = 30;
                const STEP = 800 / FPS;
                const STEPS = 50;
                const LAST_ROW_DURATION = 7000;
                const LAST_ROW_STOP = LAST_ROW_DURATION / DURATION;

                const trailLayer = el.querySelector("#trail-layer");
                const scrambleLayer = el.querySelector("#scramble-layer");
                const finalLayer = el.querySelector("#final-layer");

                if (!trailLayer || !scrambleLayer || !finalLayer) {
                    console.warn('SRIA Animation: Missing layers', { trailLayer, scrambleLayer, finalLayer });
                    return;
                }

                const lastLineStart = baseText.lastIndexOf("\n") + 1;

                function isLastRowIndex(i) {
                    return i >= lastLineStart && baseText[i] !== "\n" && baseText[i] !== " ";
                }

                const locked = new Array(baseText.length).fill(false);
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

                    const spans = finalLayer.querySelectorAll(".final-letter");
                    spans.forEach(span => {
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
                                const ch = randomChar();
                                const color = randomColor();
                                html += `<span style="color:${color}">${ch}</span>`;
                            }
                            continue;
                        }

                        if (locked[i]) {
                            html += " ";
                            continue;
                        }

                        let ch = randomChar();

                        if (ch === t) {
                            locked[i] = true;
                        } else {
                            const forceLockProb = eased * 0.15;
                            if (Math.random() < forceLockProb) {
                                locked[i] = true;
                            }
                        }

                        const color = randomColor();
                        html += `<span style="color:${color}">${ch}</span>`;
                    }

                    return html;
                }

                function updateFinalVisibility() {
                    for (let i = 0; i < baseText.length; i++) {
                        const t = baseText[i];
                        if (t === "\n" || t === " " || isLastRowIndex(i)) continue;

                        const span = finalSpans[i];
                        if (!span) continue;

                        span.style.opacity = locked[i] ? 1 : 0;
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
                                const t = baseText[i];
                                if (t === "\n" || t === " " || isLastRowIndex(i)) continue;
                                locked[i] = true;
                            }
                            updateFinalVisibility();
                            scrambleLayer.innerHTML = "";
                            clearInterval(interval);
                        }

                        step++;
                    }, STEP);
                }

                // Use IntersectionObserver to start animation when visible
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            animate();
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });

                observer.observe(el);
            });
        }
    };
})(Drupal, once);
