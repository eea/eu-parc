(function ($, Drupal, once, drupalSettings) {
  // Edit year colors here — shared across all charts.
  const YEAR_COLORS = {
    2022: "#017365",
    2023: "#E4798B",
    2024: "#1879EB",
    2025: "#2DC9B6",
    2026: "#C0A456",
    2027: "#7D2D9C",
    2028: "#DB5749",
    2029: "#cd0505",
  };

  function scrollChart(chartElement) {
    let container = chartElement.find(".indicator-scrollable-container");
    let content = container.find(".indicator-container");
    let scroll =
      (content.get(0).offsetWidth - container.get(0).offsetWidth) / 2;
    container.scrollLeft(scroll);
  }

  Drupal.behaviors.indicatorCharts = {
    attach: function (context, settings) {
      const observerOptions = {
        root: null,
        rootMargin: "50px",
        threshold: 0.1,
      };
      Drupal.behaviors.bootstrapPopover.attach();
      const chartObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const chartElement = $(entry.target);
            const chartType = chartElement.data("chart-type");
            const id = chartElement.data("chart-id");
            const chartData = drupalSettings.parc_core?.indicator_data[id];

            if (chartData) {
              buildIndicatorChart(chartElement, chartType, chartData);
              scrollChart(chartElement);
              observer.unobserve(entry.target);
            }
          }
        });
      }, observerOptions);

      $(once("indicatorChart", "[data-chart-type]")).each(function () {
        chartObserver.observe(this);
      });

      function buildIndicatorChart(wrapper, chartType, chartData) {
        const wrapperId = wrapper.attr("id");
        const buildFunctions = {
          map: buildMapChart,
          horizontal_bar: buildHorizontalBarChart,
          vertical_bar: buildVerticalBarChart,
          radial: buildRadialChart,
          group_pie: buildGroupPieChart,
          pie: buildPieChart,
          classic_pie: buildClassicPieChart,
          trainings: buildTrainingsChart,
          synergies: buildSynergiesChart,
          images: buildImagesChart,
          output_02: buildOutput02Chart,
          output_11: buildOutput11Chart,
        };

        const buildFunction = buildFunctions[chartType];
        buildFunction(wrapperId, chartData);
        addPlayButtonToLegend(`#${wrapperId} .legend`, wrapperId);
        wrapper.find(".legend > div:last-child").addClass("active");
      }

      function buildClassicPieChart(wrapperId, chartData) {
        const colors = YEAR_COLORS;
        const years = Object.keys(chartData.chart);
        const year = years[years.length - 1];

        const data = chartData.chart[year];
        const colorHex = colors[year]; // Hex color for the specified year

        // Function to convert hex color to RGBA with specified opacity
        function hexToRGBA(hex, opacity) {
          hex = hex.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const adjustedOpacity = opacity < 0.1 ? opacity * 4 : opacity;

          return `rgba(${r}, ${g}, ${b}, ${adjustedOpacity})`;
        }

        // Get container dimensions dynamically
        const containerElement = document.querySelector(
          `.indicator-chart__wrapper`
        );
        const containerWidth = containerElement ? containerElement.clientWidth : 1100;

        const margin = { top: 60, right: 20, bottom: 0, left: 20 };
        const svgWidth = Math.max(Math.min(containerWidth, 650), 500); // Min width 500px, max width 650px
        const svgHeight = svgWidth <= 418 ? 600 : 1000;
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;
        const radius = Math.min(width, height) / 2 - 60;

        const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);
        const duration = 700;

        // Extract sorted categories
        const largestValue = sortedData[0][1];
        const percentages = sortedData.map(
          ([key, value]) => value / largestValue
        );

        const svg = d3
          .select(`#${wrapperId} .indicator-container`)
          .append("svg")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .append("g")
          .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`); // Center the pie chart

        // Outer pie chart (for the edges)
        const pie = d3
          .pie()
          .value((d) => d[1])
          .sort(null);
        const pieData = pie(sortedData);

        const outerArc = d3
          .arc()
          .innerRadius(radius - 20) // Outer radius of the outer pie
          .outerRadius(radius); // Inner radius of the outer pie

        // Draw the outer pie slices
        svg
          .selectAll(".outerSlice")
          .data(pieData)
          .enter()
          .append("path")
          .attr("class", "outerSlice")
          .attr("d", outerArc) // Initial outer arc state
          .style("stroke", "white")
          .style("fill", "white")
          .style("stroke-width", 2)
          .attr("d", outerArc) // Update the outer arc state
          .style("fill", "white")
          .transition()
          .duration(duration)
          .delay((d, i) => i * (duration - 275)) // Stagger the transitions by index
          .duration(duration) // Adjust duration as necessary
          .attrTween("d", function (d) {
            // Interpolate the arc from a small slice to the full arc
            const interpolate = d3.interpolate(
              { ...d, endAngle: d.startAngle }, // Start with a very small arc
              d // Final arc
            );
            return function (t) {
              return outerArc(interpolate(t));
            };
          })
          .style("fill", (d, i) => hexToRGBA(colorHex, percentages[i])); // Change the color during the transition

        // Inner pie chart (for the hollowed-out interior)
        const innerPie = d3
          .pie()
          .value((d) => d.value)
          .sort(null);
        const innerArc = d3
          .arc()
          .innerRadius(0) // Inner radius of the inner pie
          .outerRadius(radius - 20); // Outer radius of the inner pie (adjust as needed for thickness)

        const innerPieData = innerPie(
          Object.entries(data).map(([key, value]) => ({
            category: key,
            value: value,
          }))
        );

        // Draw the inner pie slices
        svg
          .selectAll(".innerSlice")
          .data(pieData)
          .enter()
          .append("path")
          .attr("class", "innerSlice")
          .attr("d", innerArc)
          .style("fill", "none") // Transparent fill
          .style("stroke", "none")

          // Start with the slices as zero arcs
          .attr("d", function (d) {
            return innerArc({ ...d, endAngle: d.startAngle }); // Zero-length arcs
          })

          // Transition to full arcs with colors from outer slices
          .transition()
          .delay((d, i) => i * (duration - 275)) // Delay each slice based on its index
          .duration(duration)
          .attrTween("d", function (d) {
            // Interpolate from zero-length arc to full arc
            const interpolate = d3.interpolate(
              { ...d, endAngle: d.startAngle }, // Start with a small arc
              d // Full arc
            );
            return function (t) {
              return innerArc(interpolate(t));
            };
          })
          .style("fill", "white") // Set color from outer slices
          .style("stroke", "black") // Optionally set stroke color to match
          .style("stroke-width", 0)
          .on("end", () => {
            let pieRadius = radius;

            const maxLabelWidth = 80;
            const labelWidthAngleRatio = (maxLabelWidth + 30) / (2 * pieRadius); // Assuming pieRadius is the radius of your pie chart

            // Convert ratio to radians
            const thresholdAngle = Math.atan(labelWidthAngleRatio); // This gives you the threshold angle in radians
            const thresholdAngleDegrees = thresholdAngle * (180 / Math.PI);

            let i = 0;
            let outers = [];
            let first_outer_x = 0;
            let first_outer_y = 0;
            let font_size = svgWidth < 500 ? 10 : 12;
            svg
              .selectAll(".sliceLabel")
              .data(pieData)
              .enter()
              .append("text")
              .attr("class", "sliceLabel")
              .attr("transform", function (d) {
                // Calculate the angle of the slice
                let startAngle = (d.startAngle * 180) / Math.PI;
                let endAngle = (d.endAngle * 180) / Math.PI;
                let angle = (endAngle - startAngle) % 360;

                // Adjust label placement based on slice size
                if (angle > thresholdAngleDegrees) {
                  // Place label inside the pie chart
                  [x, y] = innerArc.centroid(d);
                  if (x < 0) {
                    x -= 12;
                  }
                  i++;
                  return `translate(${x},${y})`;
                } else {
                  // Place label outside the pie chart
                  let [x, y] = outerArc.centroid(d);
                  // check if the label collides with the previous label
                  outers.push(i);
                  if (outers.length == 1) {
                    const labelDistance = svgWidth < 600 ? 80 : 150;
                    first_outer_x = x - labelDistance;
                    first_outer_y = y - 10;
                  }

                  i++;
                  return `translate(${first_outer_x},${first_outer_y})`;
                }
              })
              .attr("dy", "0.35em")
              .attr("text-anchor", "middle")
              .text((d) => `${d.data[0]}\n${d.data[1]}`)
              .style("font-size", `${font_size}px`)
              .style("fill", `${colorHex}`)
              .call(wrap2, maxLabelWidth)
              .style("opacity", "0")
              .transition()
              .delay(duration) // Sync the delay with the arc transition
              .duration(300) // Duration for the fade-in effect
              .style("opacity", "1"); // Fade in to full opacity;

            svg.selectAll(".sliceLabel").each(function (d, i) {
              if (outers.includes(i)) {
                let index = outers.indexOf(i);
                let children = d3.select(this).node().children;
                let newX = first_outer_x + index * 20;
                let newY =
                  first_outer_y - index * (font_size + 8) * children.length;

                if (index != 0) {
                  let sibling = d3.select(this).node().previousSibling;
                  // translate this label to x = index*10, y =  - index* 7*children.length\

                  // Update label transform attribute
                  d3.select(this).attr(
                    "transform",
                    `translate(${newX},${newY})`
                  );
                }
                let [centroidX, centroidY] = outerArc.centroid(d);
                let lineX1 = centroidX; // Start at centroidX
                let lineY1 = centroidY; // Start at centroidY
                let lineX2 = centroidX; // End at newX
                let lineY2 = newY; // Horizontal line at same Y as centroid

                const horizontalOffset = svgWidth < 600 ? 5 : 10;
                let endX =
                  newX +
                  children.item(0).getBoundingClientRect().width / 2 +
                  horizontalOffset;
                let endY = lineY2 - 20;

                svg
                  .append("line")
                  .attr("class", "connector-line")

                  .attr("x1", lineX1)
                  .attr("y1", lineY1 - 10)
                  .attr("x2", lineX1)
                  .attr("y2", lineY1 - 10)
                  .transition()
                  .delay(duration)
                  .duration(300)
                  .attr("x2", lineX2)
                  .attr("y2", endY)
                  .attr("stroke", "gray")
                  .attr("stroke-width", 1)
                  .on("end", () => {
                    svg
                      .append("line")
                      .attr("class", "connector-line")

                      .attr("x1", lineX2)
                      .attr("y1", endY)
                      .attr("x2", lineX2) // End at newX
                      .attr("y2", endY) // Horizontal line at same Y as vertical end
                      .transition()
                      .duration(300)
                      .attr("x2", endX)
                      .attr("stroke", "gray")
                      .attr("stroke-width", 1);
                  });

                // Draw horizontal line
              }
            }, 1000);
          });

        function wrap2(text, width) {
          text.each(function () {
            let text = d3.select(this),
              lines = text.text().split(/\n/), // Split by \n for manual line breaks
              lineHeight = 1.4, // ems
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy"));

            text.text(null); // Clear existing text

            lines.forEach((line, index) => {
              line = line.replace(/\//g, " / ");
              let words = line.split(/\s+/); // Split each line by \s to create words
              let tspan = text
                .append("tspan")
                .attr("x", 0)
                .attr("dy", index === 0 ? 0 + "em" : lineHeight + "em") // Adjust dy for each line
                .style("font-weight", "bold")
                .text(line.toUpperCase());
              let lineLength = 0;
              words.forEach((word, i) => {
                if (i > 0) {
                  let currentLength =
                    tspan.text().length > 0
                      ? tspan.node().getComputedTextLength()
                      : 0;
                  if (currentLength + word.length > maxLabelWidth) {
                    tspan = text
                      .append("tspan")
                      .attr("x", 0)
                      .attr("dy", lineHeight + "em")
                      .style("font-weight", "bold")

                      .text(word.toUpperCase()); // Convert word to uppercase
                  } else {
                    tspan.text(tspan.text() + " " + word.toUpperCase()); // Convert word to uppercase
                  }
                } else {
                  tspan.text(word.toUpperCase()); // Convert first word to uppercase
                }
              });

              // Wrap logic based on width for the first line (data[0])
              if (index === 0) {
                let tspanNode = tspan.node();
                if (tspanNode.getComputedTextLength() > width) {
                  let words = tspan.text().split(/\s+/); // Resplit the line by \s
                  tspan.text(null); // Clear existing tspan
                  words.forEach((word, i) => {
                    if (i > 0) {
                      tspan = text
                        .append("tspan")
                        .attr("x", 0)
                        .attr("dy", lineHeight + "em")
                        .text(word); // Append tspan for each word
                    } else {
                      tspan.text(word); // Set text for the first word of the line
                    }
                  });
                }
              }
            });

            // Calculate positioning based on number of lines
            let lineNumber = lines.length;
            text.attr("x", 0).attr("y", (-lineNumber * lineHeight) / 2 + "em");
          });
        }

        function updateChart(selectedYear) {
          svg.selectAll(".connector-line").interrupt(); // Stop any ongoing transitions
          // Define the categories based on the selected year
          const colors = YEAR_COLORS;

          const data = chartData.chart[selectedYear];
          const colorHex = colors[selectedYear]; // Hex color for the specified year

          // Function to convert hex color to RGBA with specified opacity
          function hexToRGBA(hex, opacity) {
            hex = hex.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const adjustedOpacity = opacity < 0.1 ? opacity * 4 : opacity;

            return `rgba(${r}, ${g}, ${b}, ${adjustedOpacity})`;
          }

          const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);
          const largestValue = sortedData[0][1];
          const percentages = sortedData.map(
            ([key, value]) => value / largestValue
          );

          // Prepare pie data
          const pie = d3
            .pie()
            .value((d) => d[1])
            .sort(null);
          const pieData = pie(sortedData);

          // Define the arcs
          const outerArc = d3
            .arc()
            .innerRadius(radius - 20)
            .outerRadius(radius);
          const innerArc = d3
            .arc()
            .innerRadius(0)
            .outerRadius(radius - 20);

          // Update the outer pie slices
          svg.selectAll(".outerSlice").interrupt().remove();
          const outerSlices = svg
            .selectAll(".outerSlice")
            .data(pieData, (d) => d.index);

          outerSlices
            .enter()
            .append("path")
            .attr("class", "outerSlice")
            .attr("d", outerArc) // Initial outer arc state
            .style("stroke", "white")
            .style("fill", "white")
            .style("stroke-width", 2)
            .transition() // Start the transition right away since everything is new
            .duration(duration)
            .delay((d, i) => i * (duration - 275)) // Stagger the transitions by index
            .attrTween("d", function (d) {
              const interpolate = d3.interpolate(
                { ...d, endAngle: d.startAngle }, // Start with a very small arc
                d // Final arc
              );
              return function (t) {
                return outerArc(interpolate(t));
              };
            })
            .style("fill", (d, i) => hexToRGBA(colorHex, percentages[i])); // Transition to the final color

          // Update the inner pie slices
          const innerPie = d3
            .pie()
            .value((d) => d.value)
            .sort(null);
          const innerPieData = innerPie(
            sortedData.map(([key, value]) => ({ category: key, value: value }))
          );

          svg.selectAll(".innerSlice").interrupt().remove();

          const innerSlices = svg
            .selectAll(".innerSlice")
            .data(innerPieData, (d) => d.index);

          const labelUpdate = svg
            .selectAll(".sliceLabel")
            .data(pieData, (d) => d.index);

          const maxLabelWidth = 80;
          const labelWidthAngleRatio = (maxLabelWidth + 30) / (2 * radius);
          const thresholdAngle = Math.atan(labelWidthAngleRatio);
          const thresholdAngleDegrees = thresholdAngle * (180 / Math.PI);

          // Remove existing labels and lines
          svg.selectAll(".sliceLabel").remove();
          svg.selectAll(".connector-line").remove();

          let i = 0;
          let outers = [];
          let first_outer_x = 0;
          let first_outer_y = 0;
          const font_size = svgWidth < 500 ? 10 : 12;

          svg
            .selectAll(".innerSlice")
            .interrupt()
            .data(pieData)
            .enter()
            .append("path")
            .attr("class", "innerSlice")
            .attr("d", innerArc)
            .style("fill", "none") // Transparent fill
            .style("stroke", "none")

            // Start with the slices as zero arcs
            .attr("d", function (d) {
              return innerArc({ ...d, endAngle: d.startAngle }); // Zero-length arcs
            })

            // Transition to full arcs with colors from outer slices
            .transition()
            .delay((d, i) => i * (duration - 275)) // Delay each slice based on its index
            .duration(duration)
            .attrTween("d", function (d) {
              // Interpolate from zero-length arc to full arc
              const interpolate = d3.interpolate(
                { ...d, endAngle: d.startAngle }, // Start with a small arc
                d // Full arc
              );
              return function (t) {
                return innerArc(interpolate(t));
              };
            })
            .style("stroke", "black") // Optionally set stroke color to match
            .style("stroke-width", 0)
            .on("end", (d, i) => {
              svg
                .selectAll(".sliceLabel")
                .data(pieData, (d) => d.index)
                .enter()
                .append("text")
                .attr("class", "sliceLabel")
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .style("font-size", `${font_size}px`)
                .style("fill", colorHex)
                .each(function (d, i) {
                  let startAngle = (d.startAngle * 180) / Math.PI;
                  let endAngle = (d.endAngle * 180) / Math.PI;
                  let angle = (endAngle - startAngle) % 360;
                  let centroidX, centroidY;
                  let labelX, labelY;
                  let endX, endY;

                  if (angle > thresholdAngleDegrees) {
                    // Place label inside the pie chart
                    [centroidX, centroidY] = innerArc.centroid(d);
                    centroidX = centroidX < 0 ? centroidX - 12 : centroidX;
                    d3.select(this).attr(
                      "transform",
                      `translate(${centroidX},${centroidY})`
                    );
                  } else {
                    // Place label outside the pie chart
                    [centroidX, centroidY] = outerArc.centroid(d);
                    outers.push(i);
                    if (outers.length === 1) {
                      const labelDistance = svgWidth < 600 ? 80 : 150;
                      first_outer_x = centroidX - labelDistance;
                      first_outer_y = centroidY - 10;
                    }

                    let index = outers.indexOf(i);
                    labelX = first_outer_x + index * 20;
                    labelY = first_outer_y - index * (font_size + 8);

                    // get how many children this has, if it has a sibling, translate this label to x = index*10, y =  - index* 7*children.length

                    d3.select(this).attr(
                      "transform",
                      `translate(${labelX},${labelY})`
                    );

                    // Using requestAnimationFrame to wait until the text is rendered
                    setTimeout(() => {
                      // Measure the text element
                      const bbox = this.getBBox();

                      // Get how many children this has
                      let children = d3.select(this).node().children;
                      labelY = labelY - index * children.length * 10;
                      const horizontalOffset = svgWidth < 600 ? 5 : 10;
                      endX = labelX + bbox.width / 2 + horizontalOffset; // Use bbox.width for the text width
                      endY = labelY - 20;

                      d3.select(this).attr(
                        "transform",
                        `translate(${labelX},${labelY})`
                      );

                      // Draw the connector lines, one vertical and one horizontal
                      svg
                        .append("line")
                        .attr("class", `connector-line `)
                        .attr("x1", centroidX)
                        .attr("y1", centroidY - 10)
                        .attr("x2", centroidX)
                        .attr("y2", centroidY - 10)
                        .transition()
                        .delay(duration) // Sync the delay with the arc transition
                        .duration(300) // Duration for the fade-in effect
                        .attr("y2", endY)
                        .attr("stroke", "gray")
                        .attr("stroke-width", 1)
                        .on("end", () => {
                          svg
                            .append("line")
                            .attr("class", `connector-line  `)
                            .attr("x1", centroidX)
                            .attr("y1", endY)
                            .attr("x2", centroidX)
                            .attr("y2", endY)
                            .transition()
                            .duration(300)
                            .attr("x2", endX)
                            .attr("stroke", "gray")
                            .attr("stroke-width", 1);
                        });
                    }, 0); // Delay of 0 milliseconds, executes as soon as the current call stack is clear
                  }
                })
                .text((d) => `${d.data[0]}\n${d.data[1]}`)
                .call(wrap2, maxLabelWidth)
                .style("opacity", "0")
                .transition()
                .delay(duration) // Sync the delay with the arc transition
                .duration(300) // Duration for the fade-in effect
                .style("opacity", "1"); // Fade in to full opacity;
            });
        }

        function wrap2(text, width) {
          text.each(function () {
            let text = d3.select(this),
              lines = text.text().split(/\n/),
              lineHeight = 1.4,
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy"));

            text.text(null);

            lines.forEach((line, index) => {
              line = line.replace(/\//g, " / ");
              let words = line.split(/\s+/);
              let tspan = text
                .append("tspan")
                .attr("x", 0)
                .attr("dy", index === 0 ? 0 + "em" : lineHeight + "em")
                .style("font-weight", "bold")
                .text(line.toUpperCase());
              let lineLength = 0;
              words.forEach((word, i) => {
                if (i > 0) {
                  let currentLength =
                    tspan.text().length > 0
                      ? tspan.node().getComputedTextLength()
                      : 0;
                  if (currentLength + word.length > width) {
                    tspan = text
                      .append("tspan")
                      .attr("x", 0)
                      .attr("dy", lineHeight + "em")
                      .style("font-weight", "bold")
                      .text(word.toUpperCase());
                  } else {
                    tspan.text(tspan.text() + " " + word.toUpperCase());
                  }
                } else {
                  tspan.text(word.toUpperCase());
                }
              });

              if (index === 0) {
                let tspanNode = tspan.node();
                if (tspanNode.getComputedTextLength() > width) {
                  let words = tspan.text().split(/\s+/);
                  tspan.text(null);
                  words.forEach((word, i) => {
                    if (i > 0) {
                      tspan = text
                        .append("tspan")
                        .attr("x", 0)
                        .attr("dy", lineHeight + "em")
                        .text(word);
                    } else {
                      tspan.text(word);
                    }
                  });
                }
              }
            });

            let lineNumber = lines.length;
            text.attr("x", 0).attr("y", (-lineNumber * lineHeight) / 2 + "em");
          });
        }

        // Create initial legend
        const legend = d3
          .select(`#${wrapperId}`)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: "blue" })))
          .enter()
          .append("div")
          .on("click", function (event, d) {
            updateChart(d.year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => colors[d.year]);

        legend
          .append("span")
          .attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);
      }

      function buildGroupPieChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Get container dimensions dynamically
        const containerElement = document.querySelector(
          `.indicator-chart__wrapper`
        );
        const containerWidth = containerElement ? containerElement.clientWidth : 1100;

        // Calculate responsive dimensions with minimum width of 500px
        const svgWidth = Math.max(Math.min(containerWidth, 1000), 500);
        const svgHeight = svgWidth * 0.8; // Maintain 5:4 aspect ratio
        const width = svgWidth;
        const height = svgHeight;

        // Responsive radius and inner radius
        const radius = Math.min(width, height) / 2 - (svgWidth < 600 ? 100 : 140);
        const innerRadius = svgWidth < 600 ? radius / 4 : radius / 3;

        // Extract unique years from the new data structure
        let years = Object.keys(data);
        const latestYear = years[years.length - 1];

        // Extract categories from the first year (assuming all years have the same categories)
        const categories = Object.keys(data[latestYear]);

        // Colors for the categories
        const categoryColors = [
          "#F58296",
          "#8631A7",
          "#1C74FF",
          "#E1C268",
          "#008475",
          "#E1BAFF",
          "#E45C4D",
        ];
        const achievedColors = categoryColors.map((c) =>
          d3.color(c).darker(0.8).formatHex()
        );

        // Colors for the years
        const colors = YEAR_COLORS;

        const svg = d3
          .select(
            "#" +
              wrapperId +
              " .indicator-scrollable-container .indicator-container"
          )
          .append("svg")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .append("g")
          .attr("transform", `translate(${width / 2},${height / 2})`);

        // Calculate angles for each category
        const arcGenerator = d3
          .arc()
          .innerRadius(innerRadius)
          .outerRadius(radius);

        const pie = d3
          .pie()
          .sort(null)
          .value((d) => 1); // Each slice is of equal size

        function drawArcs(currentYear) {
          // Clear existing arcs and labels
          svg.selectAll(".arc").remove();
          svg.selectAll("text").remove();
          svg.selectAll(".arc-dot").remove();
          svg.selectAll(".hover-arc").remove();

          const arcs = pie(categories.map((cat) => data[currentYear][cat]));

          // Center label elements shown on hover
          const centerLabelName = svg
            .append("text")
            .attr("fill", "#000")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.3em")
            .style("font-size", svgWidth < 600 ? "14px" : "18px")
            .style("display", "none");

          const centerLabelValue = svg
            .append("text")
            .attr("fill", "#000")
            .attr("text-anchor", "middle")
            .attr("dy", "1.2em")
            .style("font-size", svgWidth < 600 ? "12px" : "16px")
            .style("display", "none");

          const ongoingLabelEl = svg
            .append("text")
            .attr("text-anchor", "middle")
            .style("font-size", svgWidth < 600 ? "12px" : "16px")
            .style("display", "none");

          const achievedLabelEl = svg
            .append("text")
            .attr("text-anchor", "middle")
            .style("font-size", svgWidth < 600 ? "12px" : "16px")
            .style("display", "none");

          // Draw arcs for each category
          arcs.forEach((arc, index) => {
            const category = categories[index];
            const categoryData = data[currentYear][category];
            arc.startAngle -= Math.PI / 4;
            arc.endAngle -= Math.PI / 4;

            // Extract ongoing/achieved/total from value
            let ongoing, achieved, total;
            if (typeof categoryData === "object" && categoryData !== null) {
              ongoing = categoryData.ongoing || 0;
              achieved = categoryData.achieved || 0;
              total = ongoing + achieved;
            } else {
              total = typeof categoryData === "number" ? categoryData : 0;
              ongoing = total;
              achieved = 0;
            }

            const color = categoryColors[index];
            const achievedColor = achievedColors[index];

            if (total === 0) {
              // Draw a dot at the arc midpoint when value is 0
              const midAngle = (arc.startAngle + arc.endAngle) / 2;
              const dotR = (innerRadius + radius) / 2;
              svg
                .append("circle")
                .attr("class", "arc-dot")
                .attr("cx", dotR * Math.cos(midAngle))
                .attr("cy", dotR * Math.sin(midAngle))
                .attr("r", 5)
                .attr("fill", color);
            } else {
              // Draw lines: ongoing first (lighter), then achieved (darker)
              svg
                .append("g")
                .attr("class", "arc arc-" + category.split(" ").join("-"))
                .selectAll(".line")
                .data(d3.range(total))
                .enter()
                .append("line")
                .attr("class", "line colored")
                .attr("x1", (d, i) => {
                  const angle =
                    arc.startAngle +
                    ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                      (2 * total);
                  return innerRadius * Math.cos(angle);
                })
                .attr("y1", (d, i) => {
                  const angle =
                    arc.startAngle +
                    ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                      (2 * total);
                  return innerRadius * Math.sin(angle);
                })
                .attr("x2", (d, i) => {
                  const angle =
                    arc.startAngle +
                    ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                      (2 * total);
                  return innerRadius * Math.cos(angle);
                })
                .attr("y2", (d, i) => {
                  const angle =
                    arc.startAngle +
                    ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                      (2 * total);
                  return innerRadius * Math.sin(angle);
                })
                .attr("stroke", (d, i) => (i < ongoing ? color : achievedColor))
                .attr("stroke-linecap", "round")
                .attr("stroke-width", svgWidth < 600 ? "3px" : "5px")
                .style("opacity", 1)
                .transition()
                .duration(750)
                .attr("x2", (d, i) => {
                  const angle =
                    arc.startAngle +
                    ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                      (2 * total);
                  return radius * Math.cos(angle);
                })
                .attr("y2", (d, i) => {
                  const angle =
                    arc.startAngle +
                    ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                      (2 * total);
                  return radius * Math.sin(angle);
                });
            }

            // Add category label just outside the slice
            const baseOuterRadius = svgWidth < 600 ? radius * 1.08 : radius * 1.15;
            const labelAngle = (arc.startAngle + arc.endAngle) / 2;

            const isNorthOrSouth = Math.abs(Math.sin(labelAngle)) > 0.9;
            const outerLabelRadius = isNorthOrSouth ? baseOuterRadius * 1.15 : baseOuterRadius;

            let anchor =
              labelAngle <= Math.PI / 2 || labelAngle >= (3 * Math.PI) / 2
                ? "start"
                : "end";
            if (
              Math.abs(Math.PI / 2 - labelAngle) <= 0.01 ||
              Math.abs((Math.PI * 3) / 2 - labelAngle) <= 0.01
            ) {
              anchor = "middle";
            }

            let labelX = outerLabelRadius * Math.cos(labelAngle);
            let labelY = outerLabelRadius * Math.sin(labelAngle);

            let textObj = svg
              .append("text")
              .attr("class", `category-label-${category.split(" ").join("-")}`)
              .attr("transform", `translate(${labelX}, ${labelY})`)
              .text(`${category}`)
              .attr("fill", color)
              .style("font-size", svgWidth < 600 ? "14px" : "20px")
              .attr("text-anchor", anchor)
              .style("opacity", 1);

            labelY += svgWidth < 600 ? 20 : 30;
            if (anchor == "start") {
              labelX += textObj.node().getBBox().width / 2;
            } else if (anchor == "end") {
              labelX -= textObj.node().getBBox().width / 2;
            }
            svg
              .append("text")
              .attr("class", `category-label-${category.split(" ").join("-")}`)
              .attr("transform", `translate(${labelX}, ${labelY})`)
              .text(total)
              .attr("fill", color)
              .style("font-size", svgWidth < 600 ? "14px" : "20px")
              .attr("text-anchor", anchor)
              .style("opacity", 1);

            // Transparent hover arc for mouse detection
            const hoverArcGen = d3.arc().innerRadius(innerRadius).outerRadius(radius);
            svg
              .append("path")
              .attr("class", "hover-arc")
              .attr("d", hoverArcGen({ startAngle: arc.startAngle, endAngle: arc.endAngle }))
              .attr("fill", "transparent")
              .attr("cursor", "pointer")
              .on("mouseover", function () {
                centerLabelName.text(category).style("display", null);
                centerLabelValue.text(total).style("display", null);
                if (total > 0 && achieved > 0) {
                  const hoverR = radius * 1.4;
                  const ongoingMidAngle =
                    arc.startAngle +
                    (arc.endAngle - arc.startAngle) * (ongoing / (2 * total));
                  const achievedMidAngle =
                    arc.startAngle +
                    (arc.endAngle - arc.startAngle) *
                      ((2 * ongoing + achieved) / (2 * total));
                  ongoingLabelEl
                    .attr("x", hoverR * Math.cos(ongoingMidAngle))
                    .attr("y", hoverR * Math.sin(ongoingMidAngle))
                    .text(`Ongoing ${ongoing}`)
                    .attr("fill", color)
                    .style("display", null);
                  achievedLabelEl
                    .attr("x", hoverR * Math.cos(achievedMidAngle))
                    .attr("y", hoverR * Math.sin(achievedMidAngle))
                    .text(`Achieved ${achieved}`)
                    .attr("fill", achievedColor)
                    .style("display", null);
                }
              })
              .on("mouseout", function () {
                centerLabelName.style("display", "none");
                centerLabelValue.style("display", "none");
                ongoingLabelEl.style("display", "none");
                achievedLabelEl.style("display", "none");
              });
          });
        }

        // Initial draw for the latest year
        drawArcs(latestYear);

        const legend = d3
          .select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: colors[year] })))
          .enter()
          .append("div")
          .on("click", function (event, d) {
            const year = d.year;
            drawArcs(year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => d.color);

        legend
          .append("span")
          .attr("class", (d) => "legend-text")
          .text((d) => d.year);

        function wrap(text, width) {
          // Function to wrap text if needed
        }
      }

      function buildPieChart(wrapperId, chartData) {
        const colors = YEAR_COLORS;

        let years = Object.keys(chartData.chart);
        const latestYear = years[years.length - 1];
        const data = chartData.chart[latestYear]; // Extract data for the year 2022

        // Get container dimensions dynamically
        const containerElement = document.querySelector(
          `.indicator-chart__wrapper`
        );
        const containerWidth = containerElement ? containerElement.clientWidth : 1100;

        // Dimensions and margins
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const svgWidth = Math.min(containerWidth, 650); // Max width of 800px
        const svgHeight = svgWidth <= 418 ? 600 : 1000;
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;
        const radius = Math.min(width, height) / 2 - 80;

        // Color scale
        const colorss = [
          "#E1C268",
          "#008474",
          "#1C74FF",
          "#F58296",
          "#8631A7",
          "#E0BAFF",
          "#E45C4D",
        ];
        const color = d3
          .scaleOrdinal()
          .domain(Object.keys(data))
          .range(colorss);

        const translateHeight = height / 2 + margin.top - 100;

        // Create SVG element with calculated dimensions
        const svg = d3
          .select(
            `#${wrapperId} .indicator-scrollable-container .indicator-container`
          )
          .append("svg")
          .attr("class", "indicator-chart-svg")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .append("g")
          .attr("transform", `translate(${svgWidth / 2},${translateHeight})`);

        const pie = d3
          .pie()
          .startAngle(-Math.PI / 2)
          .value((d) => d.value)
          .sort(null);

        const tooltip = d3
          .select(`body`)
          .append("div")
          .attr("class", "tool")
          .style("position", "absolute")
          .style("visibility", "hidden")
          .style("background", "#fff")
          .style("border", "1px solid #ccc")
          .style("padding", "5px")
          .style("border-radius", "5px");

        const pieData = pie(
          Object.entries(data).map(([key, value]) => ({
            category: key,
            value: value,
          }))
        );

        // Calculate line lengths and angles
        const lineLength = 40; // Length of each line
        const gapLength = 5;
        // Draw lines for each pie segment and add labels

        const arcGenerator = d3
          .arc()
          .innerRadius(0) // Start at the center (or you can set a small inner radius)
          .outerRadius(radius * 1.2); // Outer radius extends beyond the lines

        const responsiveFactor = svgWidth < 600 ? 1.25 : 1.15;

        pieData.forEach((slice, i) => {
          const numLines = slice.data.value; // Number of lines for this segment
          const angleStep = (slice.endAngle - slice.startAngle) / numLines;
          const labelOuterRadius = numLines <= 5 ? (responsiveFactor + 0.1) * radius : responsiveFactor * radius;

          let rotationAngle;
          let outerRadius;
          for (let j = 0; j < numLines; j++) {
            const angle = slice.startAngle + j * angleStep;
            const x1 = 0; // Start at center of the circle
            const y1 = 0; // Start at center of the circle
            const x2 = Math.cos(angle) * radius;
            const y2 = Math.sin(angle) * radius;
            outerRadius = radius * 1.2;
            // Draw line
            svg
              .append("line")
              .attr("x1", x1)
              .attr("y1", y1)
              .attr("x2", x1)
              .attr("y2", y1)
              .attr("stroke", color(i))
              .attr("stroke-width", 6)
              .attr("stroke-linecap", "round")
              .transition()
              .duration(500)
              .attr("x2", x2)
              .attr("y2", y2)
              .attr("data-index", i);
            svg
              .on("mouseover", (event, d) => {
                if (event.target.getAttribute("data-index")) {
                  tooltip
                    .style("visibility", "visible")
                    .text(
                      `${
                        pieData[event.target.getAttribute("data-index")].data
                          .category
                      }`
                    );
                } else {
                  tooltip.style("visibility", "hidden");
                }
              })
              .on("mousemove", (event, d) => {
                tooltip
                  .style("top", event.pageY - 10 + "px")
                  .style("left", event.pageX + 10 + "px");
              })
              .on("mouseout", (event, d) => {
                tooltip.style("visibility", "hidden");
              });

            if (j === 0) {
              const angleInDegrees = angle * (180 / Math.PI); // Convert angle to degrees
              const x = labelOuterRadius * Math.cos(angle);
              const y = labelOuterRadius * Math.sin(angle);
              const gapX = x2 + Math.cos(angle) * gapLength;
              const gapY = y2 + Math.sin(angle) * gapLength;
              const labelLineLength = svgWidth < 600 ? 10 : 20; // Length of the connecting line
              const labelX = gapX + Math.cos(angle) * labelLineLength;
              const labelY = gapY + Math.sin(angle) * labelLineLength;
              rotationAngle = angleInDegrees;
              if (angle > Math.PI) {
                rotationAngle += 180; // Rotate by 180 degrees for second half of the circle (right side)
              } else {
                rotationAngle -= 180; // Rotate by -180 degrees for first half of the circle (left side)
              }

              const label = svg
                .append("text")
                .attr("data-index", i)
                .attr(
                  "transform",
                  `translate(${x}, ${y}) rotate(${rotationAngle})`
                )
                .attr("dy", "0.35em")
                .style("fill", color(i))
                .attr("text-anchor", angle > Math.PI ? "end" : "start");

              // Check if text would go out of bounds
              const tempText = svg.append("text")
                .style("visibility", "hidden")
                .text(`${slice.data.value} projects`);
              const textWidth = tempText.node().getComputedTextLength();
              tempText.remove();

              // Calculate if text would overflow
              const textAnchor = (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) ? "end" : "start";
              const xPos = x + (svgWidth / 2); // Convert from center coordinates to absolute
              console.log(xPos);
              const wouldOverflow = (textAnchor === "end" && xPos - textWidth - 40 < 0) ||
                (textAnchor === "start" && xPos + textWidth + 40 > svgWidth);

              if (wouldOverflow) {
                // Split into two lines
                label.append("tspan")
                  .attr("x", 0)
                  .attr("dy", 0)
                  .text(`${slice.data.value}`);

                label.append("tspan")
                  .attr("x", 0)
                  .attr("dy", "1.2em")
                  .text("projects");

                label.attr("y", "-0.6em"); // Center the two-line text
              } else {
                // Keep on one line
                const labelText = slice.data.value == 1 ? "project" : "projects";
                label.text(`${slice.data.value} ${labelText}`);
              }

              if (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) {
                label.attr("text-anchor", "end");
              } else {
                label.attr("text-anchor", "start");
              }
              label.attr("transform", `translate(${x}, ${y}) rotate(${0})`);

              svg
                .append("line")
                .attr("x1", gapX)
                .attr("y1", gapY)
                .attr("x2", gapX)
                .attr("y2", gapY)
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .transition()
                .duration(750)
                .attr("x2", labelX)
                .attr("y2", labelY);
            }
          }

          svg
            .append("path")
            .attr(
              "d",
              arcGenerator({
                startAngle: slice.startAngle + Math.PI / 2, // Adjust start angle by -90 degrees
                endAngle: slice.endAngle + Math.PI / 2,
              })
            )
            .attr("fill", "transparent") // Make it invisible but hoverable
            .attr("data-index", i);
        });

        svg
          .append("circle")
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("r", 5)
          .attr("fill", "white");

        function updateChart(selectedYear) {
          // Select the container and remove any existing SVG elements
          const container = d3.select(
            `#${wrapperId} .indicator-scrollable-container .indicator-container`
          );
          container.selectAll(".indicator-chart-svg").remove(); // This ensures only one SVG is present

          // Extract data for the selected year
          const data = chartData.chart[selectedYear];

          // Get container dimensions dynamically
          const containerElement = document.querySelector(
            `.indicator-chart__wrapper`
          );
          const containerWidth = containerElement ? containerElement.clientWidth : 1100;
          const svgWidth = Math.min(containerWidth, 650); // Max width of 800px
          const svgHeight = svgWidth <= 418 ? 600 : 1000;

          // Create SVG element again with calculated dimensions
          const svg = container
            .insert("svg", ":first-child") // Insert SVG as the first child
            .attr("class", "indicator-chart-svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .append("g")
            .attr(
              "transform",
              `translate(${svgWidth / 2},${translateHeight})`
            ); // Adjusted for margins

          // Prepare data for pie layout
          const pieData = pie(
            Object.entries(data).map(([key, value]) => ({
              category: key,
              value: value,
            }))
          );
          const responsiveFactor = svgWidth < 600 ? 1.25 : 1.15;

          // Draw pie chart
          pieData.forEach((slice, i) => {
            const numLines = slice.data.value;
            const angleStep = (slice.endAngle - slice.startAngle) / numLines;
            const labelOuterRadius = numLines <= 5 ? (responsiveFactor + 0.1) * radius : responsiveFactor * radius;

            let rotationAngle;
            for (let j = 0; j < numLines; j++) {
              const angle = slice.startAngle + j * angleStep;
              const x1 = 0;
              const y1 = 0;
              const x2 = Math.cos(angle) * radius;
              const y2 = Math.sin(angle) * radius;

              svg
                .append("line")
                .data(pieData)
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x1)
                .attr("y2", y1)
                .attr("stroke", color(i))
                .attr("stroke-width", 6)
                .attr("stroke-linecap", "round")
                .transition()
                .duration(500)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("data-index", i);
              svg
                .on("mouseover", (event, d) => {
                  if (event.target.getAttribute("data-index")) {
                    tooltip
                      .style("visibility", "visible")
                      .text(
                        `${
                          pieData[event.target.getAttribute("data-index")].data
                            .category
                        }`
                      );
                  } else {
                    tooltip.style("visibility", "hidden");
                  }
                })
                .on("mousemove", (event, d) => {
                  tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
                })
                .on("mouseout", (event, d) => {
                  tooltip.style("visibility", "hidden");
                });
              if (j === 0) {
                const angleInDegrees = angle * (180 / Math.PI);
                const x = labelOuterRadius * Math.cos(angle);
                const y = labelOuterRadius * Math.sin(angle);
                const gapX = x2 + Math.cos(angle) * gapLength;
                const gapY = y2 + Math.sin(angle) * gapLength;
                const labelLineLength = svgWidth < 600 ? 10 : 20;
                const labelX = gapX + Math.cos(angle) * labelLineLength;
                const labelY = gapY + Math.sin(angle) * labelLineLength;
                rotationAngle = angleInDegrees;
                if (angle > Math.PI) {
                  rotationAngle += 180;
                } else {
                  rotationAngle -= 180;
                }

                const label = svg
                  .append("text")
                  .attr(
                    "transform",
                    `translate(${x}, ${y}) rotate(${rotationAngle})`
                  )
                  .attr("dy", "0.35em")
                  .style("fill", color(i))
                  .attr("text-anchor", angle > Math.PI ? "end" : "start")
                  .attr("data-index", i);

                // Check if text would go out of bounds
                const tempText = svg.append("text")
                  .style("visibility", "hidden")
                  .text(`${slice.data.value} projects`);
                const textWidth = tempText.node().getComputedTextLength();
                tempText.remove();

                // Calculate if text would overflow
                const textAnchor = (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) ? "end" : "start";
                const xPos = x + (svgWidth / 2); // Convert from center coordinates to absolute
                const wouldOverflow = (textAnchor === "end" && xPos - textWidth - 40 < 0) ||
                  (textAnchor === "start" && xPos + textWidth + 40 > svgWidth);

                if (wouldOverflow) {
                  // Split into two lines
                  label.append("tspan")
                    .attr("x", 0)
                    .attr("dy", 0)
                    .text(`${slice.data.value}`);

                  label.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .text("projects");

                  label.attr("y", "-0.6em"); // Center the two-line text
                } else {
                  const labelText = slice.data.value == 1 ? "project" : "projects";
                  // Keep on one line
                  label.text(`${slice.data.value} ${labelText}`);
                }

                // wrap(label, 200, i);
                if (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) {
                  label.attr("text-anchor", "end");
                } else {
                  label.attr("text-anchor", "start");
                }
                label.attr("transform", `translate(${x}, ${y}) rotate(${0})`);

                svg
                  .append("line")
                  .attr("x1", gapX)
                  .attr("y1", gapY)
                  .attr("x2", labelX)
                  .attr("y2", labelY)
                  .attr("stroke", "black")
                  .attr("stroke-width", 1)
                  .transition()
                  .duration(500)
                  .attr("x2", labelX)
                  .attr("y2", labelY);
              }
            }
            svg
              .append("path")
              .attr(
                "d",
                arcGenerator({
                  startAngle: slice.startAngle + Math.PI / 2, // Adjust start angle by -90 degrees
                  endAngle: slice.endAngle + Math.PI / 2,
                })
              )
              .attr("fill", "transparent") // Make it invisible but hoverable
              .attr("data-index", i);
          });

          svg
            .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 5)
            .attr("fill", "white");

          // Calculate line counts for each item first
          const lineHeightPx = 14.4; // 12px font * 1.2 line height
          const baseItemHeight = 20; // Base height for circle and padding
          const maxTextWidth = svgWidth / 1.3;

          // Helper to calculate lines needed for text
          function calculateLineCount(text, width, fontSize = 12) {
            const tempText = svg.append("text")
              .attr("font-size", `${fontSize}px`)
              .text(text)
              .style("visibility", "hidden");

            const words = text.split(/\s+/).reverse();
            let lineCount = 0;
            let line = [];
            let word;

            while (word = words.pop()) {
              line.push(word);
              tempText.text(line.join(" "));
              if (tempText.node().getComputedTextLength() > width) {
                lineCount++;
                line = [word];
                tempText.text(word);
              }
            }
            if (line.length > 0) lineCount++;

            tempText.remove();
            return lineCount;
          }

          // Calculate heights and positions
          const dataEntries = Object.entries(data);
          const itemHeights = dataEntries.map(([key]) => {
            const lines = calculateLineCount(key, maxTextWidth);
            return Math.max(baseItemHeight, lines * lineHeightPx + 8);
          });

          // Calculate cumulative Y positions
          const yPositions = [0];
          for (let i = 1; i < itemHeights.length; i++) {
            yPositions[i] = yPositions[i - 1] + itemHeights[i - 1];
          }

          const legendGroup = svg.append("g")
            .attr("class", "legend-container")
            .attr("transform", `translate(${-svgWidth / 2 + margin.left + 20}, ${radius * 1.5})`);

          const legendItems = legendGroup.selectAll(".legend-item")
            .data(dataEntries)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${yPositions[i]})`);

          legendItems.append("circle")
            .attr("cx", 8)
            .attr("cy", 8)
            .attr("r", 8)
            .attr("fill", d => color(d[0]));

          legendItems.append("text")
            .attr("x", 24)
            .attr("y", 12)
            .attr("font-size", "12px")
            .attr("fill", "gray")
            .text(d => d[0])
            .each(function() {
              d3.select(this).call(wrapLegendText, maxTextWidth);
            });
        }

        // Calculate line counts for each item first
        const lineHeightPx = 14.4; // 12px font * 1.2 line height
        const baseItemHeight = 20; // Base height for circle and padding
        const maxTextWidth = svgWidth / 1.3;

        // Helper to calculate lines needed for text
        function calculateLineCount(text, width, fontSize = 12) {
          const tempText = svg.append("text")
            .attr("font-size", `${fontSize}px`)
            .text(text)
            .style("visibility", "hidden");

          const words = text.split(/\s+/).reverse();
          let lineCount = 0;
          let line = [];
          let word;

          while (word = words.pop()) {
            line.push(word);
            tempText.text(line.join(" "));
            if (tempText.node().getComputedTextLength() > width) {
              lineCount++;
              line = [word];
              tempText.text(word);
            }
          }
          if (line.length > 0) lineCount++;

          tempText.remove();
          return lineCount;
        }

        // Calculate heights and positions
        const dataEntries = Object.entries(data);
        const itemHeights = dataEntries.map(([key]) => {
          const lines = calculateLineCount(key, maxTextWidth);
          return Math.max(baseItemHeight, lines * lineHeightPx + 8);
        });

        // Calculate cumulative Y positions
        const yPositions = [0];
        for (let i = 1; i < itemHeights.length; i++) {
          yPositions[i] = yPositions[i - 1] + itemHeights[i - 1];
        }

        const legendGroup = svg.append("g")
          .attr("class", "legend-container")
          .attr("transform", `translate(${-svgWidth / 2 + margin.left + 20}, ${radius * 1.5})`);

        const legendItems = legendGroup.selectAll(".legend-item")
          .data(dataEntries)
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, i) => `translate(0, ${yPositions[i]})`);

        legendItems.append("circle")
          .attr("cx", 8)
          .attr("cy", 8)
          .attr("r", 8)
          .attr("fill", d => color(d[0]));

        legendItems.append("text")
          .attr("x", 24)
          .attr("y", 12)
          .attr("font-size", "12px")
          .attr("fill", "gray")
          .text(d => d[0])
          .call(wrapLegendText, maxTextWidth); // Wrap text to fit in available width


        const legend = d3
          .select(`#${wrapperId}`)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: "blue" })))
          .enter()
          .append("div")
          .on("click", function (event, d) {
            updateChart(d.year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => colors[d.year]);

        legend
          .append("span")
          .attr("class", (d) => "legend-text")
          .text((d) => d.year);

        // Helper function to wrap legend text
        function wrapLegendText(text, width) {
          text.each(function() {
            const text = d3.select(this);
            const words = text.text().split(/\s+/).reverse();
            let word;
            let line = [];
            let lineNumber = 0;
            const lineHeight = 1.2; // ems
            const x = text.attr("x");
            const y = text.attr("y");
            const dy = 0;
            let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
              }
            }
          });
        }
      }

      function wrap(text, width, i) {
        text.each(function () {
          let text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text
              .text(null)
              .append("tspan")
              .attr("x", 0)
              .attr("y", 0)
              .attr("dy", 0 + "em")
              .attr("data-index", i);
          firstTspan = tspan;
          let line = [],
            lineNumber = 0,
            word,
            tspanNode = tspan.node();
          while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));
            tspanNode = tspan.node();
            if (word === "projects") {
              // Create a bold tspan for the word "projects"
              tspan.style("font-weight", "bold");
            }
            if (
              tspanNode.getComputedTextLength() > width ||
              word === "projects"
            ) {
              if (word === "projects") {
                // Add the word "projects" to the current line
                tspan.text(line.join(" "));
                line = [];
                // Append a new tspan without any word
                tspan = text
                  .append("tspan")
                  .attr("x", 0)
                  .attr("dy", lineHeight + "em")
                  .text("")
                  .attr("data-index", i);
              } else {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text
                  .append("tspan")
                  .attr("x", 0)
                  .attr("dy", lineHeight + "em")
                  .text(word)
                  .attr("data-index", i);
              }
              lineNumber++;
            }
          }
          text.attr("x", 0).attr("y", (-lineNumber * lineHeight) / 2 + "em");
          firstTspan.attr("dy", (-(lineNumber - 1) * lineHeight) / 2 + "em");
        });
      }

      function buildMapChart(wrapperId, chartData) {
        const data = chartData.chart;
        const years = Object.keys(data);
        const year = years[years.length - 1];
        const dataYear = data[year];

        const colors = YEAR_COLORS;

        function hexToRGBA(hex, opacity) {
          hex = hex.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const adjustedOpacity = opacity < 0.1 ? opacity * 4 : opacity;
          return `rgba(${r}, ${g}, ${b}, ${adjustedOpacity})`;
        }
        const categories = {
          member: {
            color: colors[year],
            label: `${dataYear.member} MEMBER STATES`,
          },
          associated: {
            color: hexToRGBA(colors[year], 0.6),
            label: `${dataYear.associated} ASSOCIATED COUNTRIES`,
          },
          "non-associated": {
            color: hexToRGBA(colors[year], 0.2),
            label: `${dataYear["non-associated"]} NON-ASSOCIATED THIRD COUNTRIES`,
          },
        };

        const margin = { top: 20, right: 20, bottom: 40, left: 20 },
          width = 1100 - margin.left - margin.right,
          height = 800 - margin.top - margin.bottom;

        const svg = d3
          .select(
            "#" +
              wrapperId +
              " .indicator-scrollable-container .indicator-container"
          )
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        const minRadius = 20;
        let radiusScale = d3.scaleSqrt().domain([0, 0]).range([0, 0]);

        if (dataYear && dataYear.data) {
          const values = Object.values(dataYear.data).map((d) => d.value);
          radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(values)])
            .range([minRadius, 40]);
        }

        const simulation = d3
          .forceSimulation(Object.values(dataYear.data))
          .force("x", d3.forceX((d) => d.x).strength(0.5))
          .force("y", d3.forceY((d) => d.y).strength(0.5))
          .force(
            "collide",
            d3.forceCollide((d) => radiusScale(d.value) + 2).strength(1)
          )
          .on("tick", ticked);

        // Add map background
        // Adjust these values to position and scale the map
        const mapX = -40;
        const mapY = 20;
        const mapWidth = 1240; // Default to full width
        const mapHeight = 740; // Default to full height

        svg
          .append("image")
          .attr("href", "/modules/custom/parc_core/assets/europemap.png")
          .attr("x", mapX)
          .attr("y", mapY)
          .attr("width", mapWidth)
          .attr("height", mapHeight);

        const node = svg
          .selectAll(".bubble")
          .data(Object.values(dataYear.data))
          .enter()
          .append("g")
          .attr("class", "bubble");

        node
          .append("circle")
          .attr("r", (d) => radiusScale(d.value))
          .attr("fill", (d) => categories[d.category].color)
          .attr("stroke", "white")
          .style("opacity", 0)
          .transition() // Add transition to animate the radius growth
          .duration(400) // Duration of the animation (adjust as needed)
          .delay((d, i) => i * 50) // Delay each bubble by 200ms times its index
          .style("opacity", 1)
          .attr("stroke-width", 1.5);

        node.each(function (d) {
          const numLines = d.value;
          const radius = radiusScale(d.value);
          const innerRadius = radius * 0.7;
          const outerRadius = radius * 0.9;
          const angleStep = (2 * Math.PI) / numLines;
          d3.select(this)
            .selectAll("line")
            .data(d3.range(numLines))
            .enter()
            .append("line")
            .attr("x1", (d, i) => innerRadius * Math.cos(i * angleStep))
            .attr("y1", (d, i) => innerRadius * Math.sin(i * angleStep))
            .attr("x2", (d, i) => outerRadius * Math.cos(i * angleStep))
            .attr("y2", (d, i) => outerRadius * Math.sin(i * angleStep))
            .attr("stroke", "white")
            .attr("stroke-width", 2);
        });

        node
          .append("text")
          .attr("class", (d) => `text text-${d.category}`)
          .attr("dy", "-0.2em")
          .style("font-size", "10px")
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .style("opacity", 0)
          .transition() // Add transition to animate the radius growth
          .duration(400) // Duration of the animation (adjust as needed)
          .delay((d, i) => i * 50) // Delay each bubble by 200ms times its index
          .style("opacity", 1)

          .text((d) => d.value);

        node
          .append("text")
          .attr("class", (d) => `text text-${d.category}`)
          .attr("dy", "1em")
          .style("font-size", "10px")
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .style("opacity", 0)
          .transition() // Add transition to animate the radius growth
          .duration(400) // Duration of the animation (adjust as needed)
          .delay((d, i) => i * 50) // Delay each bubble by 200ms times its index
          .style("opacity", 1)

          .text((d) => d.country);

        const legend = svg
          .selectAll(".legend")
          .data(Object.keys(categories))
          .enter()
          .append("g")
          .attr("class", (d, i) => `legend legend${i}`)
          .attr("transform", (d, i) => `translate(${-width},${i * 20})`)
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            const active = d3.select(this).classed("active");
            d3.select(this).classed("active", !active);
            const opacity = active ? 1 : 0;
            svg
              .selectAll(`circle[fill="${categories[d].color}"]`)
              .transition()
              .style("opacity", opacity);
            svg.selectAll(`.text-${d}`).transition().style("opacity", opacity);
          });

        legend
          .append("circle")
          .attr("cx", width)
          .attr("cy", height - 50)
          .attr("r", 8)
          .attr("fill", (d) => categories[d].color);

        legend
          .append("text")
          .attr("x", width + 15)
          .attr("y", height - 50)
          .attr("dy", ".35em")
          .style("text-anchor", "start")
          .style("font-weight", "bold")
          .style("font-family", "Satoshi")
          .style("font-size", "10px")
          .text((d) => categories[d].label);

        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height - 10)
          .attr("text-anchor", "middle")
          .text(
            `${year} - ${dataYear.total_countries} Countries - ${dataYear.total} Partners`
          )
          .style("font-size", "12px")
          .attr("fill", "gray");

        function ticked() {
          node.attr("transform", (d) => `translate(${d.x},${d.y})`);
        }

        const leg = d3
          .select(`#${wrapperId}`)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: "blue" })))
          .enter()
          .append("div")
          .on("click", function (event, year) {
            updateChart(year.year);
          });

        leg
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => colors[d.year]);

        leg
          .append("span")
          .attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);

        function updateChart(selectedYear) {
          const dataYear = data[selectedYear];
          if (
            !dataYear ||
            !dataYear.data ||
            Object.keys(dataYear.data).length === 0
          ) {
            // Clear existing SVG content if no data
            svg.selectAll("*").remove();

            // Optionally display a message or handle the empty data case
            svg
              .append("text")
              .attr("class", "no-data-message")
              .attr("x", width / 2)
              .attr("y", height / 2)
              .attr("text-anchor", "middle")
              .style("font-size", "16px")
              .attr("fill", "gray")
              .text("No data available for the selected year");

            return; // Exit function early if no data
          }
          // Define categories based on the new year
          const categories = {
            member: {
              color: colors[selectedYear],
              label: `${dataYear.member} MEMBER STATES`,
            },
            associated: {
              color: hexToRGBA(colors[selectedYear], 0.6),
              label: `${dataYear.associated} ASSOCIATED COUNTRIES`,
            },
            "non-associated": {
              color: hexToRGBA(colors[selectedYear], 0.2),
              label: `${dataYear["non-associated"]} NON-ASSOCIATED THIRD COUNTRIES`,
            },
          };

          // Update radius scale based on new data
          const values = Object.values(dataYear.data);
          let val = values.map((d) => d.value);
          if (values.length) {
            radiusScale = d3
              .scaleSqrt()
              .domain([0, d3.max(val)])
              .range([minRadius, 40]);
          }

          // Clear existing SVG content
          svg.selectAll("*").remove();

          // Recreate the force simulation
          const simulation = d3
            .forceSimulation(values)
            .force("x", d3.forceX((d) => d.x).strength(0.5))
            .force("y", d3.forceY((d) => d.y).strength(0.5))
            .force(
              "collide",
              d3.forceCollide((d) => radiusScale(d.value) + 2).strength(1)
            )
            .on("tick", ticked);

          // Append new nodes
          const node = svg.selectAll(".bubble").data(values); // Use a unique identifier if possible

          // Enter selection
          const nodeEnter = node.enter().append("g").attr("class", "bubble");

          nodeEnter
            .append("circle")
            .attr("r", (d) => radiusScale(d.value))
            .attr("fill", (d) => categories[d.category].color)
            .attr("stroke", "white")
            .style("opacity", 0)
            .transition() // Add transition to animate the radius growth
            .duration(400) // Duration of the animation (adjust as needed)
            .delay((d, i) => i * 50) // Delay each bubble by 200ms times its index
            .style("opacity", 1)
            .attr("stroke-width", 1.5);

          nodeEnter
            .append("text")
            .attr("class", (d) => `text text-${d.category}`)
            .attr("dy", "-0.2em")
            .style("font-size", "10px")
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .style("opacity", 0)
            .transition() // Add transition to animate the radius growth
            .duration(400) // Duration of the animation (adjust as needed)
            .delay((d, i) => i * 50) // Delay each bubble by 200ms times its index
            .style("opacity", 1)

            .text((d) => d.value);
          nodeEnter
            .append("text")
            .attr("class", (d) => `text text-${d.category}`)
            .attr("dy", "1em")
            .style("font-size", "10px")
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .style("opacity", 0)
            .transition() // Add transition to animate the radius growth
            .duration(400) // Duration of the animation (adjust as needed)
            .delay((d, i) => i * 50) // Delay each bubble by 200ms times its index
            .style("opacity", 1)

            .text((d) => d.country);

          // Update existing nodes
          node
            .merge(nodeEnter)
            .select("circle")
            .attr("r", (d) => radiusScale(d.value))
            .attr("fill", (d) => categories[d.category].color);

          // Remove old lines and append new lines
          node.selectAll("line").remove();
          const bubbles = svg.selectAll(".bubble");
          bubbles.each(function (d) {
            const numLines = d.value;
            const radius = radiusScale(d.value);
            const innerRadius = radius * 0.7;
            const outerRadius = radius * 0.9;
            const angleStep = (2 * Math.PI) / numLines;

            // Select all lines within this node and bind new data
            const lines = d3
              .select(this)
              .selectAll("line")
              .data(d3.range(numLines), (line, index) => index);

            // Enter selection: Append new lines
            lines
              .enter()
              .append("line")
              .attr("x1", (line, i) => innerRadius * Math.cos(i * angleStep))
              .attr("y1", (line, i) => innerRadius * Math.sin(i * angleStep))
              .attr("x2", (line, i) => outerRadius * Math.cos(i * angleStep))
              .attr("y2", (line, i) => outerRadius * Math.sin(i * angleStep))
              .attr("stroke", "white")
              .attr("stroke-width", 2);

            // Update selection: Update existing lines
            lines
              .attr("x1", (line, i) => innerRadius * Math.cos(i * angleStep))
              .attr("y1", (line, i) => innerRadius * Math.sin(i * angleStep))
              .attr("x2", (line, i) => outerRadius * Math.cos(i * angleStep))
              .attr("y2", (line, i) => outerRadius * Math.sin(i * angleStep));

            // Exit selection: Remove old lines that are no longer needed
            lines.exit().remove();
          });

          const legend = svg
            .selectAll(".legend")
            .data(Object.keys(categories))
            .enter()
            .append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${-width},${i * 20})`)
            .style("cursor", "pointer")
            .on("click", function (event, d) {
              const active = d3.select(this).classed("active");
              d3.select(this).classed("active", !active);
              const opacity = active ? 1 : 0;
              svg
                .selectAll(`circle[fill="${categories[d].color}"]`)
                .transition()
                .style("opacity", opacity);
              svg
                .selectAll(`.text-${d}`)
                .transition()
                .style("opacity", opacity);
            });

          legend
            .append("circle")
            .attr("cx", width)
            .attr("cy", height - 50)
            .attr("r", 8)
            .attr("fill", (d) => categories[d].color);

          legend
            .append("text")
            .attr("x", width + 15)
            .attr("y", height - 50)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .style("font-weight", "bold")
            .style("font-family", "Satoshi")
            .style("font-size", "10px")
            .text((d) => categories[d].label);

          // Update chart details text
          svg
            .append("text")
            .attr("class", "legend-details")
            .attr("x", width / 2)
            .attr("y", height - 10)
            .attr("text-anchor", "middle")
            .text(
              `${selectedYear} - ${dataYear.total_countries} Countries - ${dataYear.total} Partners`
            )
            .style("font-size", "12px")
            .attr("fill", "gray");

          function ticked() {
            svg
              .selectAll(".bubble")
              .attr("transform", (d) => `translate(${d.x},${d.y})`);
          }
        }
      }

      function buildHorizontalBarChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Extract unique years and categories from the new data structure
        const years = Object.keys(data);
        const categories = [
          ...new Set(Object.values(data).flatMap(Object.keys)),
        ];
        const latestYear = years[years.length - 1];

        // Get container dimensions dynamically
        const containerElement = document.querySelector(
          `.indicator-chart__wrapper`
        );
        const containerWidth = containerElement ? containerElement.clientWidth : 1100;

        // Calculate responsive dimensions with minimum width of 600px
        const svgWidth = Math.max(Math.min(containerWidth, 1100), 600);

        const margin = { top: 20, right: 30, bottom: 80, left: 200 },
          width = svgWidth - margin.left - margin.right,
          height = 200 + categories.length * 20 - margin.top - margin.bottom,
          maxWidth = svgWidth < 600 ? 19 : 25; // Responsive bar thickness: 19px minimum on small screens

        // Colors for the years
        const colors = YEAR_COLORS;

        const svg = d3
          .select(
            "#" +
              wrapperId +
              " .indicator-scrollable-container .indicator-container"
          )
          .append("svg")
          .attr("width", svgWidth)
          .attr("height", height + margin.top + margin.bottom)
          .style("padding-right", "20px")
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
        const y = d3
          .scaleBand()
          .domain(categories)
          .range([0, height])
          .padding(0.2);

        const x = d3
          .scaleLinear()
          .domain([
            0,
            d3.max(
              Object.values(data),
              (yearData) =>
                d3.max(Object.values(yearData), (value) => +value) * 1.1
            ),
          ])
          .nice()
          .range([0, svgWidth < 600 ? width * 0.7 : width]); // Shorter bars on smaller screens

        // Function to update the chart based on the selected year
        function updateChart(selectedYear) {
          const bars = svg.selectAll(".bar-group").data(categories);

          const barsEnter = bars
            .enter()
            .append("g")
            .attr("class", "bar-group")
            .attr("transform", (d) => `translate(0,${y(d)})`);

          barsEnter
            .merge(bars)
            .selectAll("rect")
            .data((category) => [
              {
                year: selectedYear,
                value: data[selectedYear][category] || 0,
              },
            ])
            .join("rect")
            .attr("y", 0) // Reset y position to 0
            .attr("x", 0)
            .attr("width", 0) // Start with width 0 for the transition
            .attr("height", Math.min(y.bandwidth(), maxWidth)) // Start with height 0 for the transition
            .attr("fill", (d) => colors[d.year])
            .attr("rx", 10) // Rounded corners
            .attr("ry", 10) // Rounded corners
            .attr("transform", function (d) {
              const barWidth = Math.min(y.bandwidth(), maxWidth);
              return `translate(0, ${(y.bandwidth() - barWidth) / 2})`; // Center the bar within its group
            })
            .transition()
            .duration(750)
            .attr("width", (d) => x(d.value)) // Transition to the new width
            .attr("height", Math.min(y.bandwidth(), maxWidth)); // Transition to the new height

          bars.exit().remove();
        }

        updateChart(latestYear);

        svg.append("g").call(d3.axisLeft(y));

        svg
          .append("g")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x));

        svg
          .append("text")
          .attr("class", "axis-label")
          .attr(
            "transform",
            `translate(${width / 2} ,${height + margin.top + 20})`
          )
          .style("text-anchor", "middle")
          .style("fill", "#818181")
          .text(chartData.label_x);

        svg
          .append("text")
          .attr("class", "axis-label")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - height / 2)
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text(chartData.label_y);

        // Creating the legend using divs
        const legend = d3
          .select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years)
          .enter()
          .append("div")
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            // Update chart to show data for the clicked year
            updateChart(d);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => colors[d]);

        legend
          .append("span")
          .attr("class", (d) => "legend-text year-" + d)
          .text((d) => d);

        // Scroll container to the left on initial render
        setTimeout(() => {
          const scrollContainer = document.querySelector(`#${wrapperId} .indicator-scrollable-container`);
          if (scrollContainer) {
            scrollContainer.scrollLeft = 0;
          }
        }, 100);
      }

      function buildVerticalBarChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Extract unique years and categories from the new data structure
        const years = Object.keys(data);
        const categories = [
          ...new Set(Object.values(data).flatMap(Object.keys)),
        ];
        const latestYear = years[years.length - 1];

        const margin = { top: 20, right: 30, bottom: 110, left: 50 },
          width = 1100 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

        // Colors for the years
        const colors = YEAR_COLORS;

        const svg = d3
          .select(
            "#" +
              wrapperId +
              " .indicator-scrollable-container .indicator-container"
          )
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        const x0 = d3
          .scaleBand()
          .domain(categories)
          .range([0, width])
          .padding(0.2);

        const x1 = d3
          .scaleBand()
          .domain(years)
          .range([0, x0.bandwidth()])
          .padding(0.05);

        const y = d3
          .scaleLinear()
          .domain([
            0,
            d3.max(Object.values(data), (yearData) =>
              d3.max(Object.values(yearData), (value) => +value)
            ),
          ])
          .nice()
          .range([height, 0]);

        svg.append("g").call(d3.axisLeft(y));

        const xAxisGroup = svg
          .append("g")
          .attr("transform", `translate(0,${height})`);

        // Function to update the chart based on the selected year
        function updateChart(selectedYear) {
          const sortedCategories = categories.sort((a, b) => {
            const valueA = data[selectedYear][a] || 0;
            const valueB = data[selectedYear][b] || 0;
            return valueB - valueA; // Sort in descending order
          });

          x0.domain(sortedCategories); // Set the domain to the sorted categories

          // Update the x-axis labels
          xAxisGroup
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1);

          const bars = svg.selectAll(".bar-group").data(sortedCategories);

          const barsEnter = bars
            .enter()
            .append("g")
            .attr("class", "bar-group")
            .attr("transform", (d) => `translate(${x0(d)},0)`);

          const barMaxWidth = 20;
          barsEnter
            .merge(bars)
            .selectAll("rect")
            .data((category) => [
              {
                year: selectedYear,
                value: data[selectedYear][category] || 0,
              },
            ])
            .join("rect")
            .attr("x", 0)
            .attr("y", height) // Start from the bottom
            .attr("width", Math.min(barMaxWidth, x0.bandwidth()))
            .attr("height", 0) // Start with height 0 for the transition
            .attr("class", (d) => `bar${years.indexOf(d.year)}`)
            .attr("fill", (d) => colors[d.year])
            .attr("rx", 10) // Rounded corners
            .attr("ry", 10) // Rounded corners
            .attr("transform", function (d) {
              const barWidth = Math.min(x0.bandwidth(), barMaxWidth);
              return `translate(${(x0.bandwidth() - barWidth) / 2}, 0)`; // Center the bar within its group
            })
            .transition()
            .duration(750)
            .attr("y", (d) => y(d.value)) // Transition to the new y position
            .attr("height", (d) => height - y(d.value)); // Transition to the new height

          bars.exit().remove();
        }

        updateChart(latestYear);

        svg
          .append("text")
          .attr("class", "axis-label")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left)
          .attr("x", 0 - height / 2)
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text(chartData.label_y);

        svg
          .append("text")
          .attr("class", "axis-label")
          .attr(
            "transform",
            `translate(${width / 2} ,${height + margin.top + 30})`
          )
          .style("text-anchor", "middle")
          .text(chartData.label_x);

        // Creating the legend using divs
        const legend = d3
          .select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: colors[year] })))
          .enter()
          .append("div")
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            // Update chart to show data for the clicked year
            updateChart(d.year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => d.color);

        legend
          .append("span")
          .attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);

        // Scroll container to the left on initial render
        setTimeout(() => {
          const scrollContainer = document.querySelector(`#${wrapperId} .indicator-scrollable-container`);
          if (scrollContainer) {
            scrollContainer.scrollLeft = 0;
          }
        }, 100);
      }

      function buildRadialChart(wrapperId, chartData) {
        const data = chartData.chart;
        const width = 250;
        const height = 250;
        const innerRadius = 60;
        const outerRadius = Math.min(width, height) / 2 - 35;
        const numLines = 100;
        const margin = { top: 20, bottom: 10 };

        // Extract unique years from the new data structure
        const years = Object.keys(chartData.chart);
        const latestYear = years[years.length - 1];

        // Extract categories from the first year (assuming all years have the same categories)
        const categories = Object.keys(data[latestYear]);

        // Colors for the years
        const colors = YEAR_COLORS;

        const svg = d3
          .select(
            "#" +
              wrapperId +
              " .indicator-scrollable-container .indicator-container"
          )
          .selectAll(".radial-chart")
          .data(categories)
          .enter()
          .append("svg")
          .attr("class", "radial-chart")
          .attr("width", width)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr(
            "transform",
            `translate(${width / 2},${height / 2 + margin.top})`
          );

        const angle = (2 * Math.PI) / numLines;

        // Generate lines
        svg.each(function (category) {
          const g = d3.select(this);
          for (let i = 0; i < numLines; i++) {
            g.append("line")
              .attr("class", "line")
              .attr("x1", innerRadius * Math.cos(angle * i))
              .attr("y1", innerRadius * Math.sin(angle * i))
              .attr("x2", outerRadius * Math.cos(angle * i))
              .attr("y2", outerRadius * Math.sin(angle * i))
              .attr("stroke", "#E9E9E9");
          }
        });

        // Color the lines based on values and add labels
        svg.each(function (category) {
          years.forEach((year) => {
            const linesToColor = Math.round(
              (data[year][category] / 100) * numLines
            );
            const midAngle = angle * linesToColor;
            const labelX =
              (outerRadius + 18) * Math.cos(midAngle - (8 * Math.PI) / 180);
            const labelY =
              (outerRadius + 18) * Math.sin(midAngle - (8 * Math.PI) / 180);
            const label = d3
              .select(this)
              .append("text")
              .attr("class", `label-${year}`)
              .attr("x", labelX)
              .attr("y", labelY)
              .attr("dy", "0.35em")
              .text(`${data[year][category]}%`)
              .attr("fill", colors[year])
              .style("font-size", "12px")
              .attr("text-anchor", midAngle > Math.PI ? "end" : "start")
              .style("opacity", 0);
            let linesFinished = 0; // Counter for finished lines

            // Loop to create and transition lines
            for (let j = 0; j < linesToColor; j++) {
              setTimeout(() => {
                // Append a line
                const line = d3
                  .select(this)
                  .append("line")
                  .attr("class", `line colored value${year}`)
                  .attr("x1", innerRadius * Math.cos(angle * j))
                  .attr("y1", innerRadius * Math.sin(angle * j))
                  .attr("x2", outerRadius * Math.cos(angle * j))
                  .attr("y2", outerRadius * Math.sin(angle * j))
                  .attr("stroke", colors[year])
                  .style("opacity", 0) // Start with opacity 0
                  .transition()
                  .style("opacity", year === latestYear ? 1 : 0) // Show only the latest year by default
                  .on("end", () => {
                    // Callback for when the transition ends
                    linesFinished++; // Increment the counter
                    if (linesFinished === linesToColor) {
                      // Check if all lines are done
                      label
                        .transition() // Transition the label opacity
                        .style("opacity", year === latestYear ? 1 : 0); // Set opacity to 1
                    }
                  });
              }, j * 5);
            }
          });
        });

        svg
          .append("text")
          .attr("class", "category-label")
          .text((category) => category)
          .attr("fill", "black")
          .style("font-size", "12px")
          .attr("text-anchor", "middle");

        const legend = d3
          .select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: colors[year] })))
          .enter()
          .append("div")
          .on("click", function (event, d) {
            // Block clicks while animating

            years.forEach((year) => {
              svg.each(function () {
                d3.select(this)
                  .selectAll(`.line.value${year}`)
                  .interrupt() // Interrupt any ongoing line transitions
                  .style("opacity", 0); // Optionally reset to initial opacity

                d3.select(this)
                  .selectAll(`.label-${year}`)
                  .interrupt() // Interrupt any ongoing label transitions
                  .style("opacity", 0); // Optionally reset to initial opacity
              });
            });

            // Show the selected year's lines with staggered transitions
            let j = 0;
            svg.each(function (category) {
              const lineSelection = d3
                .select(this)
                .selectAll(`.line.value${d.year}`)
                .style("opacity", 0); // Set initial opacity to 0

              lineSelection
                .transition()
                .delay((d, i) => i * 5) // Staggered delay
                .style("opacity", 1) // Animate to opacity 1
                .on("end", function () {
                  // After the transition ends, show the labels
                  d3.select(this.parentNode) // Select the parent to get the right context
                    .selectAll(`.label-${d.year}`)
                    .transition() // Optionally add transition for labels too
                    .style("opacity", 1) // Show the label for the selected year
                    .on("end", function () {});
                });
            });
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => d.color);

        legend
          .append("span")
          .attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);

        svg.selectAll(".category-label").call(wrap, innerRadius + 20);

        function wrap(text, width) {
          text.each(function () {
            let text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              lineHeight = 1.1, // ems
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy")),
              tspan = text
                .text(null)
                .append("tspan")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", 0 + "em"),
              firstTspan = tspan;
            let line = [],
              lineNumber = 0,
              word,
              tspanNode = tspan.node();
            while ((word = words.pop())) {
              line.push(word);
              tspan.text(line.join(" "));
              tspanNode = tspan.node();
              if (tspanNode.getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text
                  .append("tspan")
                  .attr("x", 0)
                  .attr("dy", lineHeight + "em")
                  .text(word);
                lineNumber++;
              }
            }
            text.attr("x", 0).attr("y", (-lineNumber * lineHeight) / 2 + "em");
            firstTspan.attr("dy", (-(lineNumber - 1) * lineHeight) / 2 + "em");
          });
        }
      }

      function buildTrainingsChart(wrapperId, chartData) {
        const colors = YEAR_COLORS;

        function hexToRgb(hex) {
          hex = hex.replace("#", "");
          let r = parseInt(hex.substring(0, 2), 16);
          let g = parseInt(hex.substring(2, 4), 16);
          let b = parseInt(hex.substring(4, 6), 16);
          return { r, g, b };
        }

        function rgbToHex(r, g, b) {
          return (
            "#" +
            ((1 << 24) | (r << 16) | (g << 8) | b)
              .toString(16)
              .slice(1)
              .toUpperCase()
          );
        }

        function adjustColor(color, amount) {
          let { r, g, b } = hexToRgb(color);
          r = Math.min(255, Math.max(0, r + amount));
          g = Math.min(255, Math.max(0, g + amount));
          b = Math.min(255, Math.max(0, b + amount));
          return rgbToHex(r, g, b);
        }

        const years = Object.keys(chartData.chart);
        const months = [
          "JAN",
          "FEB",
          "MAR",
          "APR",
          "MAY",
          "JUN",
          "JUL",
          "AUG",
          "SEP",
          "OCT",
          "NOV",
          "DEC",
        ];
        const latestYear = years[years.length - 1];

        const monthsWithData = Object.keys(chartData.chart[latestYear]);
        const yearData = chartData.chart[latestYear];
        const maxData = Math.max(
          ...monthsWithData.map((month) => yearData[month].length)
        );
        const maxDuration = Math.max(
          ...monthsWithData.map((month) =>
            Math.max(...yearData[month].map((event) => event.Duration))
          )
        );
        const minDuration = Math.min(
          ...monthsWithData.map((month) =>
            Math.min(...yearData[month].map((event) => event.Duration))
          )
        );
        const maxParticipants = Math.max(
          ...monthsWithData.map((month) =>
            Math.max(...yearData[month].map((event) => event.Participants))
          )
        );
        const minParticipants = Math.min(
          ...monthsWithData.map((month) =>
            Math.min(...yearData[month].map((event) => event.Participants))
          )
        );
        const latestYearColors = [
          adjustColor(colors[latestYear], 60),
          adjustColor(colors[latestYear], -60),
        ];
        const margin = { top: 60, right: 20, bottom: 0, left: 20 };
        const radius = 75;
        const segmentLength = 70;
        const minWidth = d3.select(`#${wrapperId}`).node().getBoundingClientRect().width;
        const width = Math.max(minWidth,
          600 +
          (segmentLength + 40) * Math.max(0, maxData) -
          margin.left -
          margin.right);
        const height =
          720 +
          (segmentLength + 20) * Math.max(0, maxData - 1) -
          margin.top -
          margin.bottom;

        const transformHeight = height / 2 - 120;

        const svg = d3
          .select(
            `#${wrapperId} .indicator-scrollable-container .indicator-container`
          )
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", `translate(${width / 2}, ${transformHeight})`);

        $(`#${wrapperId}`).attr("style", "text-align: center");

        const angleStep = (2 * Math.PI) / months.length;
        const startAngle = -Math.PI / 2;

        const colorScale = d3
          .scaleLinear()
          .domain([minDuration, maxDuration])
          .range(latestYearColors);
        const widthScale = d3
          .scaleLinear()
          .domain([minParticipants, maxParticipants])
          .range([3, 13]);
        months.forEach((month, i) => {
          const angle = startAngle + angleStep * i;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          svg
            .append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(month)
            .style("font-size", "14px")
            .style("fill", "#000");

          const radiusForSegments = radius + 20;
          const events = yearData[month] || [];
          events.forEach((ev, j) => {
            const segmentStart = radiusForSegments + j * (segmentLength + 15);
            const segmentEnd = segmentStart + segmentLength;
            const x1 = segmentStart * Math.cos(angle);
            const y1 = segmentStart * Math.sin(angle);
            const x2 = segmentEnd * Math.cos(angle);
            const y2 = segmentEnd * Math.sin(angle);

            let strokeColor = colorScale(ev.Duration);
            let strokeWidth = widthScale(ev.Participants);

            let hours_string = ev.Duration == 1 ? 'hour' : 'hours';
            let html = `<p style="font-size: 12px; color: ${strokeColor}" class="font-small">${ev['displayed_date']}</p><p><b>${ev.Title}</b></p><p style="color: ${strokeColor}"><b>${ev.Participants} participants, ${ev.Duration} ${hours_string}</b></p>`;
            if (ev.Link) {
              html += `<p>Click to view the training</p>`;
            }
            const link = ev.Link;
            svg
              .append("a")
              .attr("data-bs-html", "true")
              .attr("data-bs-placement", "top")
              .attr("data-bs-toggle", "popover")
              .attr("data-bs-trigger", "hover")
              .attr("data-bs-content", function (d) {
                return html;
              })
              .attr("target", "_blank")
              .attr("href", function (d) {
                return link ? link : null;
              })
              .append("line")
              .attr("x1", x1)
              .attr("y1", y1)
              .attr("x2", x1)
              .attr("y2", y1)
              .attr("stroke", strokeColor)
              .attr("stroke-width", strokeWidth)
              .attr("stroke-linecap", "round")
              .transition()
              .duration(750)
              .delay(100 * j)
              .attr("x2", x2)
              .attr("y2", y2);

            $(function () {
              Tooltip.Default.allowList.p = ["style"];
              $('[data-bs-toggle="popover"]').popover();
            });
          });
        });
        const legend = d3
          .select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: colors[year] })))
          .enter()
          .append("div")
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            updateChart(d.year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => d.color);

        legend
          .append("span")
          .attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);

        const legendGroup = svg.append("g")
          .attr("class", "legend-container")
          .attr("transform", `translate(${width / 2 - margin.left - 220}, ${transformHeight + 100})`);

        const gradientStart = adjustColor(colors[latestYear], 60);
        const gradientEnd = adjustColor(colors[latestYear], -60);

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
          .attr("id", "participants-gradient")
          .attr("x1", "0%")
          .attr("x2", "100%")
          .attr("y1", "0%")
          .attr("y2", "0%");

        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", gradientStart);
        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", gradientEnd);

        legendGroup.append("text")
          .attr("class", "legend-title")
          .text("Duration")
          .attr("x", 0)
          .attr("y", 0)
          .attr("font-size", "17px")
          .attr("dy", "1em");

        const strokeWidths = [2, 4, 6, 8];
        const strokeLength = 50;

        legendGroup.append("rect")
          .attr("x", 0)
          .attr("y", 30)
          .attr("width", (strokeLength + 2) * strokeWidths.length)
          .attr("height", 10)
          .attr("fill", "url(#participants-gradient)");

        legendGroup.append("text")
          .attr("class", "legend-title")
          .text("Number of participants")
          .attr("x", 0)
          .attr("y", 60)
          .attr("font-size", "17px")
          .attr("dy", "1em");


        legendGroup.selectAll(".duration-bar")
          .data(strokeWidths)
          .enter()
          .append("rect")
          .attr("class", "duration-bar")
          .attr("x", (d, i) => i * 52)
          .attr("y", (d, i) => 100 + (strokeWidths.length - i))
          .attr("width", strokeLength)
          .attr("height", d => d)
          .attr("fill", "black")
          .attr("rx", 5)
          .attr("ry", 5);


        function updateChart(year) {
          svg.selectAll("line").remove();
          d3.select(`#${wrapperId}`).selectAll(".legend-container").remove();

          let minus60Color = adjustColor(colors[year], -60);
          let plus60Color = adjustColor(colors[year], 60);

          let yearColors = [
            plus60Color,
            minus60Color,
          ];

          console.log(yearColors, latestYearColors, year, colors, colors[year], plus60Color, minus60Color);

          const yearData = chartData.chart[year];

          const monthsWithData = Object.keys(chartData.chart[year]);
          const maxData = Math.max(
            ...monthsWithData.map((month) => yearData[month].length)
          );
          const maxDuration = Math.max(
            ...monthsWithData.map((month) =>
              Math.max(...yearData[month].map((event) => event.Duration))
            )
          );
          const minDuration = Math.min(
            ...monthsWithData.map((month) =>
              Math.min(...yearData[month].map((event) => event.Duration))
            )
          );
          const maxParticipants = Math.max(
            ...monthsWithData.map((month) =>
              Math.max(...yearData[month].map((event) => event.Participants))
            )
          );
          const minParticipants = Math.min(
            ...monthsWithData.map((month) =>
              Math.min(...yearData[month].map((event) => event.Participants))
            )
          );
          const margin = { top: 60, right: 20, bottom: 0, left: 20 };
          const radius = 75;
          const segmentLength = 70;
          const width = Math.max(minWidth,
            600 +
            (segmentLength + 40) * Math.max(0, maxData) -
            margin.left -
            margin.right);
          const height =
            720 +
            (segmentLength + 20) * Math.max(0, maxData - 1) -
            margin.top -
            margin.bottom;

          const transformHeight = height / 2 - 120;

          d3.select(`#${wrapperId} svg`)
            .attr("width", width)
            .attr("height", height);

          d3.select(`#${wrapperId} svg g`).attr(
            "transform",
            `translate(${width / 2}, ${transformHeight})`
          );

          const colorScale = d3
            .scaleLinear()
            .domain([minDuration, maxDuration])
            .range(yearColors);
          const widthScale = d3
            .scaleLinear()
            .domain([minParticipants, maxParticipants])
            .range([3, 13]);

          monthsWithData.forEach((month, i) => {
            const angle = startAngle + angleStep * months.indexOf(month);
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            const events = yearData[month] || [];
            events.forEach((ev, j) => {
              const segmentStart = radius + 20 + j * (segmentLength + 15);
              const segmentEnd = segmentStart + segmentLength;

              const x1 = segmentStart * Math.cos(angle);
              const y1 = segmentStart * Math.sin(angle);
              const x2 = segmentEnd * Math.cos(angle);
              const y2 = segmentEnd * Math.sin(angle);

              let strokeColor = colorScale(ev.Duration);
              let strokeWidth = widthScale(ev.Participants);

              let hours_string = ev.Duration == 1 ? 'hour' : 'hours';
              let html = `<p style="font-size: 12px; color: ${strokeColor}" class="font-small">${ev['displayed_date']}</p><p><b>${ev.Title}</b></p><p style="color: ${strokeColor}"><b>${ev.Participants} participants, ${ev.Duration} ${hours_string}</b></p>`;
              if (ev.Link) {
                html += `<p>Click to view the training</p>`;
              }
              const link = ev.Link;

              svg
                .append("a")
                .attr("data-bs-html", "true")
                .attr("data-bs-placement", "top")
                .attr("data-bs-toggle", "popover")
                .attr("data-bs-trigger", "hover")
                .attr("data-bs-content", function (d) {
                  return html;
                })
                .attr("target", "_blank")
                .attr("href", function (d) {
                  return link ? link : null;
                })
                .classed("image", true)
                .append("line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x1)
                .attr("y2", y1)
                .attr("stroke", strokeColor)
                .attr("stroke-width", strokeWidth)
                .attr("stroke-linecap", "round")
                .transition()
                .duration(750)
                .delay(100 * j)
                .attr("x2", x2)
                .attr("y2", y2);

              $(function () {
                Tooltip.Default.allowList.p = ["style"];
                $('[data-bs-toggle="popover"]').popover();
              });
            });
          });
          const legendGroup = svg.append("g")
            .attr("class", "legend-container")
            .attr("transform", `translate(${width / 2 - margin.left - 220}, ${transformHeight + 100})`);

          const gradientStart = adjustColor(colors[year], 60);
          const gradientEnd = adjustColor(colors[year], -60);
          let defs = svg.append("defs");
          let gradient = defs.append("linearGradient")
            .attr("id", `participants-gradient-${year}`)
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

          gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", plus60Color);
          gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", minus60Color);

          legendGroup.append("text")
            .attr("class", "legend-title")
            .text("Duration")
            .attr("x", 0)
            .attr("y", 0)
            .attr("font-size", "17px")
            .attr("dy", "1em");

          const strokeWidths = [2, 4, 6, 8];
          const strokeLength = 50;

          legendGroup.append("rect")
            .attr("x", 0)
            .attr("y", 30)
            .attr("width", (strokeLength + 2) * strokeWidths.length)
            .attr("height", 10)
            .attr("fill", `url(#participants-gradient-${year})`);

          legendGroup.append("text")
            .attr("class", "legend-title")
            .text("Number of participants")
            .attr("x", 0)
            .attr("y", 60)
            .attr("font-size", "17px")
            .attr("dy", "1em");


          legendGroup.selectAll(".duration-bar")
            .data(strokeWidths)
            .enter()
            .append("rect")
            .attr("class", "duration-bar")
            .attr("x", (d, i) => i * 52)
            .attr("y", (d, i) => 100 + (strokeWidths.length - i))
            .attr("width", strokeLength)
            .attr("height", d => d)
            .attr("fill", "black")
            .attr("rx", 5)
            .attr("ry", 5);
        }
      }

      function buildSynergiesChart(wrapperId, chartData) {
        const colors = YEAR_COLORS;
        function hexToRgb(hex) {
          hex = hex.replace("#", "");
          let r = parseInt(hex.substring(0, 2), 16);
          let g = parseInt(hex.substring(2, 4), 16);
          let b = parseInt(hex.substring(4, 6), 16);
          return { r, g, b };
        }

        function rgbToHex(r, g, b) {
          return (
            "#" +
            ((1 << 24) | (r << 16) | (g << 8) | b)
              .toString(16)
              .slice(1)
              .toUpperCase()
          );
        }

        function adjustColor(color, amount) {
          let { r, g, b } = hexToRgb(color);
          r = Math.min(255, Math.max(0, r + amount));
          g = Math.min(255, Math.max(0, g + amount));
          b = Math.min(255, Math.max(0, b + amount));
          return rgbToHex(r, g, b);
        }

        // Get container dimensions dynamically
        const containerElement = document.querySelector(
          `.indicator-chart__wrapper`
        );
        const containerWidth = containerElement ? containerElement.clientWidth : 1100;

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const isSmallScreen = containerWidth < 500;
        const svgWidth = Math.min(Math.max(containerWidth, 650), 1100); // Min 650px, max 1200px
        const svgHeight = isSmallScreen ? 600 : 800;
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        // Make radius responsive based on isSmallScreen
        const baseOuterRadius = isSmallScreen ? 80 : 140;
        const outerRadius = baseOuterRadius;
        const innerRadius = isSmallScreen ? 50 : outerRadius - 50;

        // Extract the fifth category for the inner pie
        const years = Object.keys(chartData.chart);
        const latestYear = years[years.length - 1];
        const data = chartData.chart[latestYear];
        const innerCategory =
          "External initiatives seeking synergies with PARC";
        const innerValue = data[innerCategory];
        const outerCategories = Object.keys(data).filter(
          (category) => category !== innerCategory
        );
        const outerValues = outerCategories.map((category) => data[category]);
        const animationDuration = 300;
        const animationDelay = 40;
        const svg = d3
          .select(
            `#${wrapperId} .indicator-scrollable-container .indicator-container`
          )
          .append("svg")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .append("g")
          .attr(
            "transform",
            `translate(${svgWidth / 2}, ${svgHeight / 2})`
          );

        // Add central text
        svg
          .append("text")
          .classed("inner-text", true)
          .attr("transform", isSmallScreen ? "translate(0, -10)" : "")
          .attr("text-anchor", "middle")
          .style("font-size", isSmallScreen ? "12px" : "16px")
          .style("font-weight", "bold")
          .text(innerValue + "\n" + innerCategory)
          .style("opacity", "0")
          .transition()
          .duration(animationDuration)
          .delay(0)
          .style("opacity", "1"); // Value for the category

        d3.selectAll(".inner-text").call(wrap, innerRadius * 2 - 20);

        // Draw radial lines for the inner pie
        const totalLines = innerValue;
        const angleStep = (2 * Math.PI) / totalLines;

        for (let i = 0; i < totalLines; i++) {
          const angle = i * angleStep - Math.PI / 2;
          const x1 = Math.cos(angle) * innerRadius;
          const y1 = Math.sin(angle) * innerRadius;
          const x2 = Math.cos(angle) * outerRadius;
          const y2 = Math.sin(angle) * outerRadius;

          svg
            .append("line")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x1)
            .attr("y2", y1)
            .attr("stroke", `${adjustColor(colors[latestYear], -90)}`) // Dark blue color
            .attr("stroke-width", isSmallScreen ? 7 : 12)
            .attr("stroke-linecap", "round")
            .transition()
            .duration(animationDuration)
            .delay(animationDelay * i)
            .attr("x2", x2)
            .attr("y2", y2);
        }
        const outerRadiusStart = outerRadius + 20; // Start just outside the inner chart
        const outerRadiusEnd = outerRadius + (isSmallScreen ? 70 : 90); // Adjust to desired size
        const totalOuterLines = outerCategories
          .slice(0, 4)
          .reduce((sum, category) => sum + data[category], 0);
        const outerAngleStep = (2 * Math.PI) / totalOuterLines;
        let currentAngle = -Math.PI / 2; // Start at the top

        let categoryColors = [
          adjustColor(colors[latestYear], -60),
          adjustColor(colors[latestYear], -30),
          adjustColor(colors[latestYear], 30),
          adjustColor(colors[latestYear], 60),
        ];

        outerCategories.slice(0, 4).forEach((category, index) => {
          const categoryValue = data[category];
          const rotationOffset = -Math.PI / 2;
          let categoryAngle = currentAngle;

          for (let i = 0; i < categoryValue; i++) {
            const x1 = Math.cos(currentAngle) * outerRadiusStart;
            const y1 = Math.sin(currentAngle) * outerRadiusStart;
            const x2 = Math.cos(currentAngle) * outerRadiusEnd;
            const y2 = Math.sin(currentAngle) * outerRadiusEnd;

            // Draw each line
            svg
              .append("line")
              .attr("x1", x1)
              .attr("y1", y1)
              .attr("x2", x1)
              .attr("y2", y1)
              .attr("stroke", categoryColors[index]) // Unique color per category
              .attr("stroke-width", isSmallScreen ? 3 : 4)
              .transition()
              .duration(animationDuration)
              .delay(animationDelay * i)
              .attr("x2", x2)
              .attr("y2", y2);

            // Increment the angle
            currentAngle += outerAngleStep;
          }
          const labelX =
            Math.cos((categoryAngle + currentAngle) / 2) *
            (outerRadiusEnd + 20); // Position slightly beyond the outer radius
          const labelY =
            Math.sin((categoryAngle + currentAngle) / 2) *
            (outerRadiusEnd + 20);

          let addToX = 0; // Default value for X adjustment
          let addToY = 20; // Default value for Y adjustment

          categoryAngle = (categoryAngle + currentAngle) / 2;

          if (categoryAngle > -Math.PI / 9 && categoryAngle < Math.PI / 9) {
            // On top (near -20° to 20°)
            addToY = -40;
          } else if (
            categoryAngle > (8 * Math.PI) / 9 &&
            categoryAngle < (10 * Math.PI) / 9
          ) {
            // On bottom (near 160° to 200°)
            addToY = 40;
          } else if (
            categoryAngle > Math.PI / 2 &&
            categoryAngle < (3 * Math.PI) / 2
          ) {
            // On the left
            addToX = -30;
          } else {
            // On the right
            addToX = 30;
          }

          let addToX2 =
            categoryAngle > Math.PI / 2 && categoryAngle < (3 * Math.PI) / 2
              ? -60
              : 60;

          svg
            .append("text")
            .attr("x", labelX + addToX)
            .attr("y", labelY + addToY)
            .attr(
              "text-anchor",
              categoryAngle > Math.PI / 2 && categoryAngle < (3 * Math.PI) / 2
                ? "end"
                : "start"
            )
            .attr("alignment-baseline", "middle")
            .style("font-size", isSmallScreen ? "14px" : "18px")
            .style("fill", `${categoryColors[index]}`)
            .style("font-weight", "700")
            .text(category)
            .style("opacity", "0")
            .transition()
            .duration(animationDuration)
            .delay(index * animationDelay)
            .style("opacity", "1");
          svg
            .append("text")
            .attr("x", labelX + addToX + addToX2)
            .attr("y", labelY + addToY + 20) // Slightly below for the value
            .attr(
              "text-anchor",
              categoryAngle > Math.PI / 2 && categoryAngle < (3 * Math.PI) / 2
                ? "end"
                : "start"
            )
            .attr("alignment-baseline", "middle")
            .style("font-size", isSmallScreen ? "14px" : "18px")
            .style("font-weight", "700")
            .style("fill", `${categoryColors[index]}`)
            .text(categoryValue)
            .style("opacity", "0")
            .transition()
            .duration(animationDuration)
            .delay(index * animationDelay)
            .style("opacity", "1");
        });
        const legend = d3
          .select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map((year) => ({ year, color: colors[year] })))
          .enter()
          .append("div")
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            updateChart(d.year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", (d) => d.color);

        legend
          .append("span")
          .attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);

        const legendContainer = d3
          .select(`#${wrapperId}`)
          .append("div")
          .attr("class", "legend-container")
          .style("display", "flex")
          .style("justify-content", "center");

        const leg = legendContainer
          .append("div")
          .style("display", "flex")
          .style("flex-direction", "column")
          .style("align-items", "start");

        leg
          .append("div")
          .text(
            "Potential synergies per thematic area for the external initiatives (multiple possible per external initiative)"
          )
          .style("margin-bottom", "5px")
          .style("font-size", "17px")
          .style("text-align", "center")
          .style("width", "100%")
          .style("max-width", "500px");

        function wrap(text, width) {
          text.each(function () {
            let text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              lineHeight = 1.1, // ems
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy")),
              tspan = text
                .text(null)
                .append("tspan")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", 0 + "em"),
              firstTspan = tspan;
            let line = [],
              lineNumber = 0,
              word,
              tspanNode = tspan.node();
            if (words.length) {
              let firstWord = words.pop();
              tspan.text(firstWord); // First word in its own tspan
              tspan = text
                .append("tspan")
                .attr("x", 0)
                .attr("dy", lineHeight + "em");
            }
            while ((word = words.pop())) {
              line.push(word);
              tspan.text(line.join(" "));
              tspanNode = tspan.node();
              if (tspanNode.getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text
                  .append("tspan")
                  .attr("x", 0)
                  .attr("dy", lineHeight + "em")
                  .text(word);
                lineNumber++;
              }
            }
            text.attr("x", 0).attr("y", (-lineNumber * lineHeight) / 2 + "em");
            firstTspan.attr("dy", (-(lineNumber - 1) * lineHeight) / 2 + "em");
          });
        }
        function updateChart(year) {
          // Check if the year exists in the data
          if (!chartData.chart[year]) {
            console.error(`Data for year ${year} is not available.`);
            return;
          }

          // Clear the existing chart
          svg.selectAll("*").remove();

          // Extract data for the selected year
          const data = chartData.chart[year];
          const innerCategory =
            "External initiatives seeking synergies with PARC";
          const innerValue = data[innerCategory];
          const outerCategories = Object.keys(data).filter(
            (category) => category !== innerCategory
          );
          const outerValues = outerCategories.map((category) => data[category]);

          // Add central text
          svg
            .append("text")
            .classed("inner-text", true)
            .attr("transform", isSmallScreen ? "translate(0, -10)" : "")
            .attr("text-anchor", "middle")
            .style("font-size", isSmallScreen ? "12px" : "16px")
            .style("font-weight", "bold")
            .text(innerValue + "\n" + innerCategory)
            .style("opacity", 0)
            .transition()
            .duration(animationDuration)
            .style("opacity", 1);

          d3.selectAll(".inner-text").call(wrap, innerRadius * 2 - 20);

          // Draw radial lines for the inner pie
          const totalLines = innerValue;
          const angleStep = (2 * Math.PI) / totalLines;

          for (let i = 0; i < totalLines; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x1 = Math.cos(angle) * innerRadius;
            const y1 = Math.sin(angle) * innerRadius;
            const x2 = Math.cos(angle) * outerRadius;
            const y2 = Math.sin(angle) * outerRadius;

            svg
              .append("line")
              .attr("x1", x1)
              .attr("y1", y1)
              .attr("x2", x1)
              .attr("y2", y1)
              .attr("stroke", `${adjustColor(colors[year], -90)}`) // Dark blue color
              .attr("stroke-width", isSmallScreen ? 7 : 12)
              .attr("stroke-linecap", "round")
              .transition()
              .duration(animationDuration)
              .delay(animationDelay * i)
              .attr("x2", x2)
              .attr("y2", y2);
          }

          // Outer pie
          const outerRadiusStart = outerRadius + 20;
          const outerRadiusEnd = outerRadius + (isSmallScreen ? 70 : 90);
          const totalOuterLines = outerCategories
            .slice(0, 4)
            .reduce((sum, category) => sum + data[category], 0);
          const outerAngleStep = (2 * Math.PI) / totalOuterLines;
          let currentAngle = -Math.PI / 2;

          let categoryColors = [
            adjustColor(colors[year], -60),
            adjustColor(colors[year], -30),
            adjustColor(colors[year], 30),
            adjustColor(colors[year], 60),
          ];

          outerCategories.slice(0, 4).forEach((category, index) => {
            const categoryValue = data[category];
            let categoryAngle = currentAngle;

            for (let i = 0; i < categoryValue; i++) {
              const x1 = Math.cos(currentAngle) * outerRadiusStart;
              const y1 = Math.sin(currentAngle) * outerRadiusStart;
              const x2 = Math.cos(currentAngle) * outerRadiusEnd;
              const y2 = Math.sin(currentAngle) * outerRadiusEnd;

              svg
                .append("line")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x1)
                .attr("y2", y1)
                .attr("stroke", categoryColors[index])
                .attr("stroke-width", isSmallScreen ? 3 : 4)
                .transition()
                .duration(animationDuration)
                .delay(animationDelay * i)
                .attr("x2", x2)
                .attr("y2", y2);

              currentAngle += outerAngleStep;
            }
            const labelX =
              Math.cos((categoryAngle + currentAngle) / 2) *
              (outerRadiusEnd + 20); // Position slightly beyond the outer radius
            const labelY =
              Math.sin((categoryAngle + currentAngle) / 2) *
              (outerRadiusEnd + 20);

            let addToX = 0; // Default value for X adjustment
            let addToY = 20; // Default value for Y adjustment

            categoryAngle = (categoryAngle + currentAngle) / 2;

            if (categoryAngle > -Math.PI / 9 && categoryAngle < Math.PI / 9) {
              // On top (near -20° to 20°)
              addToY = -40;
            } else if (
              categoryAngle > (8 * Math.PI) / 9 &&
              categoryAngle < (10 * Math.PI) / 9
            ) {
              // On bottom (near 160° to 200°)
              addToY = 40;
            } else if (
              categoryAngle > Math.PI / 2 &&
              categoryAngle < (3 * Math.PI) / 2
            ) {
              // On the left
              addToX = -60;
            } else {
              // On the right
              addToX = 60;
            }

            let addToX2 =
              categoryAngle > Math.PI / 2 && categoryAngle < (3 * Math.PI) / 2
                ? -60
                : 60;

            svg
              .append("text")
              .attr("x", labelX + addToX)
              .attr("y", labelY + addToY)
              .attr(
                "text-anchor",
                categoryAngle > Math.PI / 2 && categoryAngle < (3 * Math.PI) / 2
                  ? "end"
                  : "start"
              )
              .attr("alignment-baseline", "middle")
              .style("font-size", isSmallScreen ? "14px" : "18px")
              .style("fill", `${categoryColors[index]}`)
              .style("font-weight", "700")
              .text(category)
              .style("opacity", "0")
              .transition()
              .duration(animationDuration)
              .delay(index * animationDelay)
              .style("opacity", "1");
            svg
              .append("text")
              .attr("x", labelX + addToX + addToX2)
              .attr("y", labelY + addToY + 20) // Slightly below for the value
              .attr(
                "text-anchor",
                categoryAngle > Math.PI / 2 && categoryAngle < (3 * Math.PI) / 2
                  ? "end"
                  : "start"
              )
              .attr("alignment-baseline", "middle")
              .style("font-size", isSmallScreen ? "14px" : "18px")
              .style("font-weight", "700")
              .style("fill", `${categoryColors[index]}`)
              .text(categoryValue)
              .style("opacity", "0")
              .transition()
              .duration(animationDuration)
              .delay(index * animationDelay)
              .style("opacity", "1");
          });
        }
      }

      function buildImagesChart(wrapperId, chartData) {
        const colors = YEAR_COLORS;

        const container = d3.select(
          `#${wrapperId} .indicator-scrollable-container .indicator-container`
        );
        const years = Object.keys(chartData.chart);
        const latestYear = years[years.length - 1];

        years.forEach((year) => {
          container
            .append("img")
            .attr("class", `chart-image chart-image-${year}`)
            .attr("src", chartData.chart[year])
            .attr("alt", `Chart for ${year}`)
            .style("display", year === latestYear ? "block" : "none")
            .style("max-width", "100%")
            .style("height", "auto");
        });

        if (years.length > 1) {
          d3.select(`#${wrapperId}`).classed("has-year-switcher", true);

          const legend = d3
            .select(`#${wrapperId}`)
            .append("div")
            .attr("class", "legend")
            .selectAll("div")
            .data(years.map((year) => ({ year, color: colors[year] })))
            .enter()
            .append("div")
            .on("click", function (event, d) {
              container.selectAll(".chart-image").style("display", "none");
              container
                .select(`.chart-image-${d.year}`)
                .style("display", "block");
            });

          legend
            .append("span")
            .attr("class", "legend-color")
            .style("background-color", (d) => d.color);

          legend
            .append("span")
            .attr("class", (d) => "legend-text year-" + d.year)
            .text((d) => d.year);
        }
      }

      // Output 02: table layout — labels in left column, one pill per cell (row=label,
      // col=year), year labels at the bottom of each column. All years always visible.
      // Height mapping: 1→3.5, 2→5, 3→7, 6→14, 9→18, 11→20 (piecewise-linear scale).
      function buildOutput02Chart(wrapperId, chartData) {
        const yearColors = YEAR_COLORS;

        const data = chartData.chart;
        const years = Object.keys(data);
        const latestYear = years[years.length - 1];
        const categories = Object.keys(data[latestYear]);

        const containerElement = document.querySelector(".indicator-chart__wrapper");
        const containerWidth = containerElement ? containerElement.clientWidth : 1000;
        const svgWidth = Math.min(containerWidth * 0.9, 850);

        const labelColW = Math.min(Math.max(svgWidth * 0.22, 120), 180);
        const dataW = svgWidth - labelColW;
        const yearColW = dataW / years.length;

        const rowH = 90;
        const yearRowH = 60;
        const svgHeight = categories.length * rowH + yearRowH + 20;

        const pillWidth = Math.min(yearColW * 0.82, 70);

        const svg = d3
          .select(`#${wrapperId} .indicator-scrollable-container .indicator-container`)
          .append("svg")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
          .style("display", "block")
          .style("margin", "0 auto")
          .style("max-width", "100%")
          .style("height", "auto");

        svg.attr("preserveAspectRatio", "xMidYMid meet");

        // Background
        svg.append("rect")
          .attr("width", svgWidth)
          .attr("height", svgHeight)
          .attr("fill", "white");

        // Scale for pill thickness
        const pillThicknessScale = d3
          .scaleLinear()
          .domain([0, 1, 3, 6, 9, 11])
          .range([4, 6, 8, 12, 16, 20])
          .clamp(true);

        // FULL vertical grid lines
        years.forEach((year, colIdx) => {
          const centerX = labelColW + yearColW * colIdx + yearColW / 2;

          svg.append("line")
            .attr("x1", centerX)
            .attr("y1", 0)
            .attr("x2", centerX)
            .attr("y2", categories.length * rowH)
            .attr("stroke", "#ececec")
            .attr("stroke-width", 1);
        });

        categories.forEach((cat, rowIdx) => {
          const rowTop = rowIdx * rowH;
          const centerY = rowTop + rowH / 2;

          // Horizontal row line starts after labels
          svg.append("line")
            .attr("x1", labelColW)
            .attr("y1", centerY)
            .attr("x2", svgWidth)
            .attr("y2", centerY)
            .attr("stroke", "#efefef")
            .attr("stroke-width", 1);

          // Category label
          svg.append("text")
            .attr("x", labelColW - 16)
            .attr("y", centerY)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .style("font-size", svgWidth < 600 ? "11px" : "13px")
            .style("fill", "#222")
            .style("font-weight", "500")
            .text(cat.toUpperCase());

          // Pills per year
          years.forEach((year, colIdx) => {
            const raw = data[year] ? data[year][cat] : undefined;
            const value = typeof raw === "number" ? raw : 0;

            const centerX = labelColW + yearColW * colIdx + yearColW / 2;
            const color = yearColors[year] || "#017365";

            const dynamicPillHeight = pillThicknessScale(value);

            // Baseline behind pill
            svg.append("line")
              .attr("x1", centerX - pillWidth / 2)
              .attr("y1", centerY)
              .attr("x2", centerX + pillWidth / 2)
              .attr("y2", centerY)
              .attr("stroke", "#e6e6e6")
              .attr("stroke-width", 4)
              .attr("stroke-linecap", "round");

            if (value > 0) {
              // Animated pill
              svg.append("line")
                .attr("x1", centerX)
                .attr("y1", centerY)
                .attr("x2", centerX)
                .attr("y2", centerY)
                .attr("stroke", color)
                .attr("stroke-width", dynamicPillHeight)
                .attr("stroke-linecap", "round")
                .transition()
                .duration(700)
                .delay(rowIdx * 80)
                .attr("x1", centerX - pillWidth / 2)
                .attr("x2", centerX + pillWidth / 2);

              // Value label
              svg.append("text")
                .attr("x", centerX)
                .attr("y", centerY)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .style("font-size", svgWidth < 600 ? "11px" : "13px")
                .style("fill", "#111")
                .style("font-weight", "700")
                .style("pointer-events", "none")
                .style("opacity", 0)
                .text(value)
                .transition()
                .delay(rowIdx * 80 + 500)
                .duration(300)
                .style("opacity", 1);
            }
          });
        });

        // Bottom separator line
        const yearLineY = categories.length * rowH;

        svg.append("line")
          .attr("x1", labelColW)
          .attr("y1", yearLineY)
          .attr("x2", svgWidth)
          .attr("y2", yearLineY)
          .attr("stroke", "#cccccc")
          .attr("stroke-width", 1);

        // Year labels
        years.forEach((year, colIdx) => {
          const centerX = labelColW + yearColW * colIdx + yearColW / 2;

          svg.append("text")
            .attr("x", centerX)
            .attr("y", yearLineY + 35)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#444")
            .style("font-weight", "500")
            .text(year);
        });
      }

      function buildOutput11Chart(wrapperId, chartData) {
        const yearColors = YEAR_COLORS;

        const data = chartData.chart || {};

        // Detect orientation. Indicator9Sub2 transposes the tablefield, so:
        //   years-in-first-row → chart[year][category]  (top keys are years)
        //   years-in-first-col → chart[category][year]  (top keys are categories)
        const isYearKey = (k) => /^\d{4}$/.test(String(k));
        const topKeys = Object.keys(data);
        let years, categories, getValue;

        if (topKeys.length === 0) return;

        if (isYearKey(topKeys[0])) {
          // chart[year][category] — years were in the first row of the tablefield.
          years = topKeys;
          categories = Object.keys(data[topKeys[topKeys.length - 1]] || {}).slice(0, 5);
          getValue = (yr, cat) => (data[yr] || {})[cat] || "";
        } else {
          // chart[category][year] — years were in the first column of the tablefield.
          categories = topKeys.slice(0, 5);
          const subKeys = Object.keys(data[topKeys[0]] || {});
          years = subKeys.filter(isYearKey);
          getValue = (yr, cat) => (data[cat] || {})[yr] || "";
        }

        if (years.length === 0 || categories.length === 0) return;

        const latestYear = years[years.length - 1];

        const containerElement = document.querySelector(".indicator-chart__wrapper");
        const containerWidth = containerElement ? containerElement.clientWidth : 1100;
        const svgWidth = Math.min(containerWidth, 1000);

        const maxR = Math.min(svgWidth * 0.18, 120);
        const minR = Math.max(maxR * 0.28, 24);
        const innerFrac = 0.32;
        const chartGap = 28;
        const strokeNormal = 1.5;
        const strokeThick = 6;

        // Default hover label offsets (multiples of r), used when not overridden per circle.
        const oOff = { x: -1.3, y: -0.2 };
        const aOff = { x:  0.3, y: -1.2 };

        // Edit circle positions and sizes here.
        // x/y are fractions of svgWidth; scale multiplies maxR for the circle radius.
        // ongoingLabelOffset / achievedLabelOffset override the defaults above per circle.
        const circlePositions = [
          // Circle 1: A=Top right, O=Bottom
          { x: 0.30, y: 0.28, scale: 2.00,
            achievedLabelOffset:  { x:  0.5, y: -1.0 },
            ongoingLabelOffset:   { x:  -0.7, y:  0.8 } },
          // Circle 2: A=Top right, O=Top left
          { x: 0.73, y: 0.22, scale: 1.50,
            achievedLabelOffset:  { x:  0.8, y: -0.8 },
            ongoingLabelOffset:   { x: -0.85, y: -0.8 } },
          // Circle 3: A=Top (2x distance), O=Bottom left
          { x: 0.58, y: 0.48, scale: 0.80,
            achievedLabelOffset:  { x: 1.04, y: -0.63 },
            ongoingLabelOffset:   { x: -1.1, y:  0.4 } },
          // Circle 4: A=Bottom right, O=Bottom left
          { x: 0.78, y: 0.50, scale: 0.65,
            achievedLabelOffset:  { x:  0.9, y:  0.66 },
            ongoingLabelOffset:   { x: -0.7, y:  -1.1 } },
          // Circle 5: A=Top right, O=Bottom right
          { x: 0.92, y: 0.41, scale: 0.40,
            achievedLabelOffset:  { x:  1.2, y: -0.1 },
            ongoingLabelOffset:   { x:  -1.2, y:  -0.1 } },
        ];

        const minScale = Math.min(...circlePositions.map((c) => c.scale));
        const maxScale = Math.max(...circlePositions.map((c) => c.scale));

        // Returns a color interpolated from light (small circle) to dark (big circle).
        function getCircleColor(baseColor, scale) {
          const t = (scale - minScale) / (maxScale - minScale || 1);
          const lightColor = d3.interpolateRgb(baseColor, "#ffffff")(0.5);
          const darkColor  = d3.interpolateRgb("#000000", baseColor)(0.55);
          return d3.interpolateRgb(lightColor, darkColor)(t);
        }

        // Parse cell value. Format is "x/y": x = ongoing, y = achieved, total = x + y.
        // PHP (Indicator9Sub2) does not parse these strings — they arrive as-is.
        function getValues(v) {
          if (typeof v === "string" && v.includes("/")) {
            const parts = v.split("/");
            const ongoing  = parseInt(parts[0].trim(), 10) || 0;
            const achieved = parseInt(parts[1].trim(), 10) || 0;
            return { ongoing, achieved, total: ongoing + achieved };
          }
          if (typeof v === "object" && v !== null) {
            const ongoing  = Number(v.ongoing  || 0);
            const achieved = Number(v.achieved || 0);
            return { ongoing, achieved, total: ongoing + achieved };
          }
          const n = Number(v) || 0;
          return { ongoing: n, achieved: 0, total: n };
        }

        function wrapText(text, maxChars) {
          if (maxChars < 4) return [String(text).slice(0, 4)];
          const words = String(text).split(/\s+/);
          const lines = [];
          let line = "";
          words.forEach((w) => {
            const candidate = line ? line + " " + w : w;
            if (candidate.length <= maxChars) {
              line = candidate;
            } else {
              if (line) lines.push(line);
              line = w.length > maxChars ? w.slice(0, maxChars) : w;
            }
          });
          if (line) lines.push(line);
          return lines.length ? lines : [String(text)];
        }

        const container = d3.select(`#${wrapperId} .indicator-scrollable-container .indicator-container`);

        function drawForYear(year) {
          container.selectAll("svg").remove();

          const baseColor = yearColors[year] || "#017365";

          const totals = categories.map((cat) => {
            const { achieved, total, ongoing } = getValues(getValue(year, cat));
            return { cat, ongoing, achieved, total };
          });
          totals.sort((a, b) => b.total - a.total);

          const maxTotal = Math.max(...totals.map((t) => t.total), 1);
          const radiusScale = d3.scaleSqrt()
            .domain([0, maxTotal]).range([minR, maxR]).clamp(true);

          let positions, svgHeight;

          if (circlePositions && circlePositions.length > 0) {
            positions = categories.map((cat, idx) => {
              const cfg = circlePositions[idx] || circlePositions[circlePositions.length - 1];
              return {
                x: cfg.x * svgWidth,
                y: cfg.y * svgWidth,
                r: (cfg.scale || 1) * maxR,
                oOff: cfg.ongoingLabelOffset || oOff,
                aOff: cfg.achievedLabelOffset || aOff,
              };
            });
            svgHeight = Math.max(...positions.map((p) => p.y + p.r + (p.r * innerFrac < 20 ? 52 : 0))) + 16;
          } else {
            const radii = totals.map(({ total }) =>
              total === 0 ? minR : radiusScale(total)
            );

            // Greedy left-to-right row wrap.
            const rows = [];
            let curRow = [], curRowW = 0, curRowMaxR = 0;
            radii.forEach((r, idx) => {
              const needed = curRow.length === 0 ? r * 2 : curRowW + chartGap + r * 2;
              if (curRow.length > 0 && needed > svgWidth) {
                rows.push({ items: curRow, maxR: curRowMaxR });
                curRow = []; curRowW = 0; curRowMaxR = 0;
              }
              curRow.push(idx);
              curRowW = curRow.length === 1 ? r * 2 : curRowW + chartGap + r * 2;
              curRowMaxR = Math.max(curRowMaxR, r);
            });
            if (curRow.length) rows.push({ items: curRow, maxR: curRowMaxR });

            positions = new Array(radii.length);
            let rowBaseY = 0;
            rows.forEach((row) => {
              let x = 0;
              row.items.forEach((idx) => {
                const r = radii[idx];
                positions[idx] = { x: x + r, y: rowBaseY + row.maxR, r, oOff, aOff };
                x += r * 2 + chartGap;
              });
              rowBaseY += row.maxR * 2 + chartGap;
            });

            svgHeight = rowBaseY - chartGap + 16;
          }

          const svgEl = container.append("svg")
            .attr("width", svgWidth).attr("height", svgHeight)
            .style("overflow", "visible");

          const circleGroups = [];
          totals.forEach(({ cat, ongoing, achieved, total }, idx) => {
            const { x, y, r, oOff: circleOOff, aOff: circleAOff } = positions[idx];
            const innerR = r * innerFrac;
            const circleScale = (circlePositions[idx] || circlePositions[circlePositions.length - 1]).scale || 1;
            const color = getCircleColor(baseColor, circleScale);
            const achievedColor = d3.color(color).darker(0.8).formatHex();

            const g = svgEl.append("g").attr("transform", `translate(${x}, ${y})`);
            circleGroups.push(g);

            // Lines — per-circle color; total lines drawn, first `achieved` classed.
            const lineGroup = g.append("g");
            if (total === 0) {
              g.append("circle").attr("r", 8).attr("fill", "#D9D9D9");
            } else {
              const angleStep = (2 * Math.PI) / total;
              for (let i = 0; i < total; i++) {
                const a = -Math.PI / 2 + i * angleStep;
                lineGroup.append("line")
                  .attr("class", i < achieved ? "achieved-line" : "")
                  .attr("x1", Math.cos(a) * innerR).attr("y1", Math.sin(a) * innerR)
                  .attr("x2", Math.cos(a) * innerR).attr("y2", Math.sin(a) * innerR)
                  .attr("stroke", color)
                  .attr("stroke-width", strokeNormal)
                  .attr("stroke-linecap", "round")
                  .transition().duration(600).delay(Math.min(8 * i, 500))
                  .attr("x2", Math.cos(a) * r).attr("y2", Math.sin(a) * r);
              }
            }

            // Category name — inside the hollow center when it fits, otherwise below.
            const fontSize = 11;
            const lineH = fontSize + 2;
            const labelOutside = total === 0 || innerR < 20;
            const maxChars = labelOutside
              ? 100
              : Math.max(Math.floor((innerR * 1.8) / (fontSize * 0.6)), 4);
            const labelLines = wrapText(cat, maxChars);
            const labelG = g.append("g");
            const labelBaseY = total === 0 ? 30 : (labelOutside ? r + lineH : 0);
            labelLines.forEach((ln, li) => {
              labelG.append("text")
                .attr("x", 0)
                .attr("y", labelBaseY + (li - (labelLines.length - 1) / 2) * lineH)
                .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
                .style("font-size", `${fontSize}px`).style("fill", "#444")
                .style("pointer-events", "none").text(ln);
            });

            // Hover overlay: total below label + Ongoing/Achieved floating labels.
            const hoverG = g.append("g").style("opacity", 0).style("pointer-events", "none");

            const totalY = labelBaseY + (labelLines.length / 2) * lineH + fontSize;
            hoverG.append("text")
              .attr("x", 0).attr("y", totalY)
              .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
              .style("font-size", "12px")
              .style("font-weight", "bold").style("fill", "#222")
              .text(total);

            if (achieved > 0) {
              const oG = hoverG.append("g")
                .attr("transform", `translate(${circleOOff.x * r}, ${circleOOff.y * r})`);
              oG.append("text")
                .attr("text-anchor", "end").attr("dominant-baseline", "middle")
                .style("font-size", "12px").style("font-weight", "bold").style("fill", color).text("Ongoing");
              oG.append("text")
                .attr("y", 16).attr("text-anchor", "end").attr("dominant-baseline", "middle")
                .style("font-size", "13px").style("font-weight", "bold").style("fill", color)
                .text(ongoing);

              const aG = hoverG.append("g")
                .attr("transform", `translate(${circleAOff.x * r}, ${circleAOff.y * r})`);
              aG.append("text")
                .attr("text-anchor", "start").attr("dominant-baseline", "auto")
                .style("font-size", "12px").style("font-weight", "bold").style("fill", achievedColor).text("Achieved");
              aG.append("text")
                .attr("y", 16).attr("text-anchor", "start").attr("dominant-baseline", "auto")
                .style("font-size", "13px").style("font-weight", "bold").style("fill", achievedColor)
                .text(achieved);
            }

            if (total > 0) {
              g.append("circle")
                .attr("r", r).attr("fill", "transparent").attr("cursor", "pointer")
                .on("mouseover", function () {
                  lineGroup.selectAll(".achieved-line")
                    .transition().duration(150)
                    .attr("stroke-width", strokeThick).attr("stroke", achievedColor);
                  labelG.selectAll("text").style("font-weight", "bold");
                  labelG.transition().duration(200).attr("transform", "translate(0, -7)");
                  hoverG.transition().duration(200).style("opacity", 1);
                  circleGroups.forEach((cg, ci) => {
                    if (ci !== idx) cg.transition().duration(150).style("opacity", 0.5);
                  });
                })
                .on("mouseout", function () {
                  lineGroup.selectAll(".achieved-line")
                    .transition().duration(150)
                    .attr("stroke-width", strokeNormal).attr("stroke", color);
                  labelG.selectAll("text").style("font-weight", "normal");
                  labelG.transition().duration(200).attr("transform", "translate(0, 0)");
                  hoverG.transition().duration(200).style("opacity", 0);
                  circleGroups.forEach((cg) => {
                    cg.transition().duration(150).style("opacity", 1);
                  });
                });
            }
          });
        }

        drawForYear(latestYear);

        // Year selector legend — same pattern as other charts.
        const legend = d3
          .select("#" + wrapperId)
          .append("div").attr("class", "legend")
          .selectAll("div")
          .data(years.map((y) => ({ year: y, color: yearColors[y] })))
          .enter().append("div")
          .on("click", function (event, d) { drawForYear(d.year); });

        legend.append("span").attr("class", "legend-color")
          .style("background-color", (d) => d.color);
        legend.append("span").attr("class", (d) => "legend-text year-" + d.year)
          .text((d) => d.year);
      }

      function addPlayButtonToLegend(selector, wrapperId) {
        const legendContainer = $(selector);

        const playButtonSvg = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7L8 5z" fill="currentColor"/>
          </svg>`;
        const playButton = $("<button>")
          .addClass("play-button")
          .css({
            "background-color": "transparent",
            border: "none",
          })
          .attr("data-chart-id", wrapperId)
          .on("click", handlePlayButtonClick)
          .html(playButtonSvg);

        legendContainer.prepend(playButton);
      }

      function handlePlayButtonClick() {
        const chartId = $(this).data("chart-id");

        const legendItems = $(`#${chartId} .legend > div`);
        legendItems.each((index, item) => {
          setTimeout(() => {
            $(item).trigger("click");
          }, index * 5000);
        });
      }
    },
  };

  Drupal.behaviors.addLegendToPublicationsChart = {
    attach: function (context, settings) {
      if (
        !$("#publicationsChart").length ||
        d3.select("#publicationsChart .legend").node()
      ) {
        return;
      }

      if (!d3.select("#publicationsChart .legend").node()) {
        const columns = document.querySelectorAll(".column");
        const yearsSet = new Set();

        columns.forEach((column) => {
          const classList = column.classList;
          const year = [...classList].find((cls) => /^\d{4}$/.test(cls));
          if (year) {
            yearsSet.add(year);
          }
        });

        const yearsArray = Array.from(yearsSet).map((year) => ({ year }));

        const latestYear = yearsArray[yearsArray.length - 1].year;

        const legend = d3
          .select(`#publicationsChart .indicator-chart`)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(yearsArray)
          .enter()
          .append("div")
          .attr("class", "legend-item")
          .on("click", function (event, d) {
            updateChart(d.year);
          });

        legend
          .append("span")
          .attr("class", "legend-color")
          .style("background-color", "black");

        legend
          .append("span")
          .attr("class", (d) => "legend-text")
          .text((d) => d.year);

        $("#publicationsChart .legend div:last").addClass("active");

        function updateChart(year) {
          $(".column").each(function () {
            $(this).find("> *").addClass("visibility-hidden");
          });

          $(".column").attr("style", "display: none;");
          $(`.column.${year}`).attr("style", "display: flex;");

          let idx = 1;
          $(`.column.${year}`).each(function () {
            $($(this).find("> *").get().reverse()).each(function () {
              let el = $(this);
              setTimeout(
                function () {
                  el.removeClass("visibility-hidden");
                },
                idx * 20,
                el
              );
              idx++;
            });
          });
        }
        updateChart(latestYear);

        function addPlayButtonToLegend() {
          const legendContainer = $("#publicationsChart .legend");

          const playButtonSvg = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7L8 5z" fill="currentColor"/>
            </svg>`;
          const playButton = $("<button>")
            .addClass("play-button")
            .css({
              "background-color": "transparent",
              border: "none",
            })
            .attr("data-chart-id", "publicationsChart")
            .on("click", handlePlayButtonClick)
            .html(playButtonSvg);

          legendContainer.prepend(playButton);
        }
        function handlePlayButtonClick() {
          const legendItems = $(`#publicationsChart .legend > div`);
          legendItems.each((index, item) => {
            setTimeout(() => {
              $(item).trigger("click");
            }, index * 5000);
          });
        }

        addPlayButtonToLegend();
      }
    },
  };
})(jQuery, Drupal, once, drupalSettings);
