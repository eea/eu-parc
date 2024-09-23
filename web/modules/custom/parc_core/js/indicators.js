(function ($, Drupal, once, drupalSettings) {
  Drupal.behaviors.indicatorCharts = {
    attach: function (context, settings) {
      $(once("indicatorChart", "[data-chart-type]")).each(function () {
        const chartType = $(this).data("chart-type");
        const id = $(this).data("chart-id");
        const chartData = drupalSettings.parc_core?.indicator_data[id];

        if (!chartData) {
          return;
        }

        buildIndicatorChart($(this), chartType, chartData);
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
        };

        const buildFunction = buildFunctions[chartType];
        buildFunction(wrapperId, chartData);
        addPlayButtonToLegend(`#${wrapperId} .legend`, wrapperId);
        wrapper.find('.legend > div:last-child').addClass('active');
      }

      function buildClassicPieChart(wrapperId, chartData) {
        // Colors generated based on the year color + opacity change.
        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
        };
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

        const margin = {top: 60, right: 20, bottom: 0, left: 20};
        const width = 600 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;
        const radius = Math.min(width, height) / 2 - 60;

        const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);

        // Extract sorted categories
        const largestValue = sortedData[0][1];
        const percentages = sortedData.map(
          ([key, value]) => value / largestValue
        );

        const svg = d3
        .select(`#${wrapperId} .indicator-container`)
        .append("svg")
        .attr("width", "1100")
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${width},${height / 2 + margin.top})`); // Center the pie chart

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
        .attr("d", outerArc)
        .style("stroke", "white")
        .style("fill", (d, i) => hexToRGBA(colorHex, percentages[i]))

        .style("stroke-width", 2);

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
        .style("stroke", "black") // Add black stroke color
        .style("stroke-width", 1); //

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
        let font_size = 12;
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
            const [x, y] = innerArc.centroid(d);
            i++;
            return `translate(${x},${y})`;
          } else {
            // Place label outside the pie chart
            let [x, y] = outerArc.centroid(d);
            // check if the label collides with the previous label
            outers.push(i);
            if (outers.length == 1) {
              first_outer_x = x - 150;
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
        .call(wrap2, maxLabelWidth);

        svg.selectAll(".sliceLabel").each(function (d, i) {
            if (outers.includes(i)) {
              let index = outers.indexOf(i);
              let children = d3.select(this).node().children;
              let newX = first_outer_x + index * 20;
              let newY = first_outer_y - index * (font_size + 8) * children.length;

              if (index != 0) {
                let sibling = d3.select(this).node().previousSibling;
                // translate this label to x = index*10, y =  - index* 7*children.length\

                // Update label transform attribute
                d3.select(this).attr("transform", `translate(${newX},${newY})`);
              }
              let [centroidX, centroidY] = outerArc.centroid(d);
              let lineX1 = centroidX; // Start at centroidX
              let lineY1 = centroidY; // Start at centroidY
              let lineX2 = centroidX; // End at newX
              let lineY2 = newY; // Horizontal line at same Y as centroid

              let endX = newX + children.item(0).getBoundingClientRect().width / 2 + 10;
              let endY = lineY2 - 20;

              svg
              .append("line")
              .attr("class", "connector-line")

              .attr("x1", lineX1)
              .attr("y1", lineY1 - 10)
              .attr("x2", lineX2)
              .attr("y2", endY)
              .attr("stroke", "gray")
              .attr("stroke-width", 1)

              // Draw horizontal line
              svg
              .append("line")
              .attr("class", "connector-line")

              .attr("x1", lineX2)
              .attr("y1", endY)
              .attr("x2", endX) // End at newX
              .attr("y2", endY) // Horizontal line at same Y as vertical end
              .attr("stroke", "gray")
              .attr("stroke-width", 1)
            }
          }
          , 1000);

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
          // Define the categories based on the selected year
          const colors = {
            2022: "#017365",
            2023: "#E4798B",
            2024: "#1879EB",
            2025: "#2DC9B6",
            2026: "#C0A456",
            2027: "#7D2D9C",
            2028: "#DB5749",
          };

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
          const percentages = sortedData.map(([key, value]) => value / largestValue);

          // Prepare pie data
          const pie = d3.pie().value(d => d[1]).sort(null);
          const pieData = pie(sortedData);

          // Define the arcs
          const outerArc = d3.arc().innerRadius(radius - 20).outerRadius(radius);
          const innerArc = d3.arc().innerRadius(0).outerRadius(radius - 20);

          // Update the outer pie slices
          const outerSlices = svg.selectAll(".outerSlice")
          .data(pieData, d => d.index);

          outerSlices
          .enter()
          .append("path")
          .attr("class", "outerSlice")
          .attr("d", outerArc)
          .style("stroke", "white")
          .style("fill", (d, i) => hexToRGBA(colorHex, percentages[i]))
          .style("stroke-width", 2)
          .merge(outerSlices)
          .attr("d", outerArc)
          .style("fill", (d, i) => hexToRGBA(colorHex, percentages[i]));

          outerSlices.exit().remove();

          // Update the inner pie slices
          const innerPie = d3.pie().value(d => d.value).sort(null);
          const innerPieData = innerPie(sortedData.map(([key, value]) => ({category: key, value: value})));

          const innerSlices = svg.selectAll(".innerSlice")
          .data(innerPieData, d => d.index);

          innerSlices
          .enter()
          .append("path")
          .attr("class", "innerSlice")
          .attr("d", innerArc)
          .style("fill", "none")
          .style("stroke", "black")
          .style("stroke-width", 1)
          .merge(innerSlices)

          .attr("d", innerArc);

          innerSlices.exit().remove();

          // Update the slice labels
          const labelUpdate = svg.selectAll(".sliceLabel")
          .data(pieData, d => d.index);

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
          const font_size = 12;

          // Append and position labels
          svg.selectAll(".sliceLabel")
          .data(pieData, d => d.index)
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
              d3.select(this).attr("transform", `translate(${centroidX},${centroidY})`);
            } else {
              // Place label outside the pie chart
              [centroidX, centroidY] = outerArc.centroid(d);
              outers.push(i);
              if (outers.length === 1) {
                first_outer_x = centroidX - 150;
                first_outer_y = centroidY - 10;
              }

              let index = outers.indexOf(i);
              labelX = first_outer_x + index * 20;
              labelY = first_outer_y - index * (font_size + 8);

              // get how many children this has, if it has a sibling, translate this label to x = index*10, y =  - index* 7*children.length


              d3.select(this).attr("transform", `translate(${labelX},${labelY})`);

              // Using requestAnimationFrame to wait until the text is rendered
              requestAnimationFrame(() => {
                // Measure the text element
                const bbox = this.getBBox();
                //get how many children this has
                let children = d3.select(this).node().children;
                labelY = labelY - index * children.length * 10
                endX = labelX + bbox.width / 2 + 10; // Use bbox.width for the text width
                endY = labelY - 20;

                d3.select(this).attr("transform", `translate(${labelX},${labelY})`);
                // Draw the connector lines, one vertical and one horizontal
                svg.append("line")
                .attr("class", "connector-line")
                .attr("x1", centroidX)
                .attr("y1", centroidY - 10)
                .attr("x2", centroidX)
                .attr("y2", endY)
                .attr("stroke", "gray")
                .attr("stroke-width", 1);

                svg.append("line")
                .attr("class", "connector-line")
                .attr("x1", centroidX)
                .attr("y1", endY)
                .attr("x2", endX)
                .attr("y2", endY)
                .attr("stroke", "gray")
                .attr("stroke-width", 1);
              });
            }
          })
          .text(d => `${d.data[0]}\n${d.data[1]}`)
          .call(wrap2, maxLabelWidth);


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
                  let currentLength = tspan.text().length > 0 ? tspan.node().getComputedTextLength() : 0;
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
        .data(years.map((year) => ({year, color: "blue"})))
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
        const width = 1000;
        const height = 800;
        const radius = Math.min(width, height) / 2 - 140;
        const innerRadius = radius / 3; // Set the inner radius for the doughnut chart

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

        // Colors for the years
        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
        };

        const svg = d3
        .select("#" + wrapperId + ' .indicator-scrollable-container .indicator-container')
        .append("svg")
        .attr("width", width)
        .attr("height", height)
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

          const arcs = pie(categories.map((cat) => data[currentYear][cat]));

          // Draw arcs for each category
          arcs.forEach((arc, index) => {
            const category = categories[index];
            const linesToColor = data[currentYear][category];
            arc.startAngle -= Math.PI / 4;
            arc.endAngle -= Math.PI / 4;

            // Draw the colored lines
            const color = categoryColors[index];
            const arcSelection = svg
            .append("g")
            .attr("class", "arc arc-" + category.split(" ").join("-"))
            .selectAll(".line")
            .data(d3.range(linesToColor))
            .enter()
            .append("line")
            .attr("class", "line colored")
            .attr("x1", (d, i) => {
              const angle =
                arc.startAngle +
                ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                (2 * linesToColor);
              return innerRadius * Math.cos(angle);
            })
            .attr("y1", (d, i) => {
              const angle =
                arc.startAngle +
                ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                (2 * linesToColor);
              return innerRadius * Math.sin(angle);
            })
            .attr("x2", (d, i) => {
              const angle =
                arc.startAngle +
                ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                (2 * linesToColor);
              return innerRadius * Math.cos(angle);
            })
            .attr("y2", (d, i) => {
              const angle =
                arc.startAngle +
                ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                (2 * linesToColor);
              return innerRadius * Math.sin(angle);
            })
            .attr("stroke", color)
            .attr("stroke-linecap", "round")
            .attr("stroke-width", "5px")
            .style("opacity", 1)
            .transition()
            .duration(750)
            .attr("x2", (d, i) => {
              const angle =
                arc.startAngle +
                ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                (2 * linesToColor);
              return radius * Math.cos(angle);
            })
            .attr("y2", (d, i) => {
              const angle =
                arc.startAngle +
                ((arc.endAngle - arc.startAngle) * (2 * i + 1)) /
                (2 * linesToColor);
              return radius * Math.sin(angle);
            })
            ;

            // Add category label just outside the slice
            const outerRadius = radius * 1.15; // Place label just outside the slice
            const labelAngle = (arc.startAngle + arc.endAngle) / 2; // Angle at the middle of the slice
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

            let labelX = outerRadius * Math.cos(labelAngle);
            let labelY = outerRadius * Math.sin(labelAngle);

            let textObj = svg
            .append("text")
            .attr("class", `category-label-${category.split(" ").join("-")}`)
            .attr("transform", `translate(${labelX}, ${labelY})`)
            .text(`${category}`)
            .attr("fill", color)
            .style("font-size", "20px")
            .attr("text-anchor", anchor)
            .style("opacity", 1); // Show only the latest year by default

            labelY += 30;
            if (anchor == "start") {
              labelX += textObj.node().getBBox().width / 2;
            } else if (anchor == "end") {
              labelX -= textObj.node().getBBox().width / 2;
            }
            svg
            .append("text")
            .attr("class", `category-label-${category.split(" ").join("-")}`)
            .attr("transform", `translate(${labelX}, ${labelY})`)
            .text(`${data[currentYear][category]}`)
            .attr("fill", color)
            .style("font-size", "20px")
            .attr("text-anchor", anchor)
            .style("opacity", 1); // Show only the latest year by default
          });
        }

        // Initial draw for the latest year
        drawArcs(latestYear);

        svg
        .append("text")
        .attr("class", "category-label")
        .attr("fill", "black")
        .style("font-size", "12px")
        .attr("text-anchor", "middle");

        const legend = d3
        .select("#" + wrapperId)
        .append("div")
        .attr("class", "legend")
        .selectAll("div")
        .data(years.map((year) => ({year, color: colors[year]})))
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
        .attr("class", (d) => "legend-text year-" + d.year)
        .text((d) => d.year);

        function wrap(text, width) {
          // Function to wrap text if needed
        }
      }

      function buildPieChart(wrapperId, chartData) {
        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
        };

        year = '2022';
        const data = chartData.chart[year]; // Extract data for the year 2022

        // Dimensions and margins
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        const width = 600 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;
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
        // Create SVG element
        const svg = d3
        .select(`#${wrapperId} .indicator-scrollable-container .indicator-container`)
        .append("svg")
        .attr("class", "indicator-chart-svg")
        .attr("width", "1100")
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr(
          "transform",
          `translate(${width},${height / 2 + margin.top})`
        ); // Adjusted for margins

        // Prepare data for pie layout
        const pie = d3
        .pie()
        .value((d) => d.value)
        .sort(null);

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
        pieData.forEach((slice, i) => {
          const numLines = slice.data.value; // Number of lines for this segment
          const angleStep = (slice.endAngle - slice.startAngle) / numLines;

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
            .attr("x2", x2)
            .attr("y2", y2)
            .attr("stroke", color(i))
            .attr("stroke-width", 6)
            .attr("stroke-linecap", "round")
            .transition()
            .duration(500)
            .attr("x2", x2)
            .attr("y2", y2);


            if (j === 0) {
              const angleInDegrees = angle * (180 / Math.PI); // Convert angle to degrees
              const x = outerRadius * Math.cos(angle);
              const y = outerRadius * Math.sin(angle);
              const gapX = x2 + Math.cos(angle) * gapLength;
              const gapY = y2 + Math.sin(angle) * gapLength;
              const labelLineLength = 20; // Length of the connecting line
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
              .attr(
                "transform",
                `translate(${x}, ${y}) rotate(${rotationAngle})`
              )
              .attr("dy", "0.35em")
              .style("fill", color(i))
              .html(`${slice.data.value} projects ${slice.data.category}`) // Display number of projects and category name
              .attr("text-anchor", angle > Math.PI ? "end" : "start")


              // Wrap the label text
              wrap(label, 200); // Adjust the width parameter as needed
              if (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) {
                // label.attr("transform", `translate(${x}, ${y}) rotate(${0})`)
                label.attr("text-anchor", "end");
              } else {
                // label.attr("transform", `translate(${x}, ${y}) rotate(${360})`)
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
        });

        // Adding the chart's title and additional information
        svg
        .append("text")
        .attr("x", 0)
        .attr("y", height / 2 + 40)
        .attr("text-anchor", "middle")
        .text(`Number of organizations`)
        .style("font-size", "12px")
        .attr("fill", "gray");

        function updateChart(selectedYear) {
          // Select the container and remove any existing SVG elements
          const container = d3.select(`#${wrapperId} .indicator-scrollable-container .indicator-container`);
          container.selectAll(".indicator-chart-svg").remove(); // This ensures only one SVG is present

          // Extract data for the selected year
          const data = chartData.chart[selectedYear];

          // Create SVG element again
          const svg = container
          .insert("svg", ":first-child") // Insert SVG as the first child
          .attr("width", "1100")
          .attr("class", "indicator-chart-svg")
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${width},${height / 2 + margin.top})`); // Adjusted for margins

          // Prepare data for pie layout
          const pieData = pie(
            Object.entries(data).map(([key, value]) => ({
              category: key,
              value: value,
            }))
          );

          // Draw pie chart
          pieData.forEach((slice, i) => {
            const numLines = slice.data.value;
            const angleStep = (slice.endAngle - slice.startAngle) / numLines;

            let rotationAngle;
            let outerRadius;
            for (let j = 0; j < numLines; j++) {
              const angle = slice.startAngle + j * angleStep;
              const x1 = 0;
              const y1 = 0;
              const x2 = Math.cos(angle) * radius;
              const y2 = Math.sin(angle) * radius;
              outerRadius = radius * 1.2;

              svg.append("line")
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
              .attr("y2", y2);

              if (j === 0) {
                const angleInDegrees = angle * (180 / Math.PI);
                const x = outerRadius * Math.cos(angle);
                const y = outerRadius * Math.sin(angle);
                const gapX = x2 + Math.cos(angle) * gapLength;
                const gapY = y2 + Math.sin(angle) * gapLength;
                const labelLineLength = 20;
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
                .attr("transform", `translate(${x}, ${y}) rotate(${rotationAngle})`)
                .attr("dy", "0.35em")
                .style("fill", color(i))
                .html(`${slice.data.value} projects ${slice.data.category}`)
                .attr("text-anchor", angle > Math.PI ? "end" : "start")


                wrap(label, 200);
                if (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) {
                  label.attr("text-anchor", "end");
                } else {
                  label.attr("text-anchor", "start");
                }
                label.attr("transform", `translate(${x}, ${y}) rotate(${0})`);

                svg.append("line")
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
          });
        }


        // Initial call to create the chart for the first year in the data
        const years = Object.keys(chartData.chart);
        const latestYear = years[years.length - 1];


        // Create initial legend
        const legend = d3
        .select(`#${wrapperId}`)
        .append("div")
        .attr("class", "legend")
        .selectAll("div")
        .data(years.map((year) => ({year, color: "blue"})))
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

      // Function to wrap text within a specified width using <tspan>
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
                .text("");
              } else {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text
                .append("tspan")
                .attr("x", 0)
                .attr("dy", lineHeight + "em")
                .text(word);
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

        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
          2029: "#cd0505"
        };

        function hexToRGBA(hex, opacity) {
          hex = hex.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const adjustedOpacity = opacity < 0.1 ? opacity * 4 : opacity;
          return `rgba(${r}, ${g}, ${b}, ${adjustedOpacity})`;
        }
        const categories = {
          member: {color: colors[year], label: `${dataYear.member} MEMBER STATES`},
          associated: {color: hexToRGBA(colors[year], 0.6), label: `${dataYear.associated} ASSOCIATED COUNTRIES`},
          "non-associated": {
            color: hexToRGBA(colors[year], 0.2),
            label:  `${dataYear["non-associated"]} NON-ASSOCIATED THIRD COUNTRIES`,
          },
        };

        const margin = {top: 20, right: 20, bottom: 40, left: 20},
          width = 1100 - margin.left - margin.right,
          height = 800 - margin.top - margin.bottom;

        const svg = d3
          .select("#" + wrapperId + ' .indicator-scrollable-container .indicator-container')
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);


        const minRadius = 20;
        let radiusScale = d3.scaleSqrt().domain([0, 0]).range([0, 0]);

        if (dataYear && dataYear.data) {
          const values = Object.values(dataYear.data).map(d => d.value);
          radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(values)])
            .range([minRadius, 40]);
        }

        const simulation = d3
          .forceSimulation(Object.values(dataYear.data))
          .force("x", d3.forceX((d) => d.x).strength(0.5))
          .force("y", d3.forceY((d) => d.y).strength(0.5))
          .force("collide", d3.forceCollide((d) => radiusScale(d.value) + 2).strength(1))
          .on("tick", ticked);

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
          .attr("class", "text")
          .attr("dy", "-0.2em")
          .style("font-size", "10px")
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text((d) => d.value);

        node
          .append("text")
          .attr("class", "text")
          .attr("dy", "1em")
          .style("font-size", "10px")
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text((d) => d.country);

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

              .style("opacity", opacity);
            svg
              .selectAll(`text[fill="${categories[d].color}"]`)
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

        svg
          .append("text")
          .attr("x", width / 2)
          .attr("y", height - 10)
          .attr("text-anchor", "middle")
          .text(`${year} - ${dataYear.total_countries} Countries - ${dataYear.total} Partners`)
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
          .data(years.map((year) => ({year, color: "blue"})))
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
          if (!dataYear || !dataYear.data || Object.keys(dataYear.data).length === 0) {
            // Clear existing SVG content if no data
            svg.selectAll("*").remove();

            // Optionally display a message or handle the empty data case
            svg.append("text")
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
            member: { color: colors[selectedYear], label: `${dataYear.member} MEMBER STATES` },
            associated: { color: hexToRGBA(colors[selectedYear], 0.6), label: `${dataYear.associated} ASSOCIATED COUNTRIES` },
            "non-associated": { color: hexToRGBA(colors[selectedYear], 0.2), label: `${dataYear["non-associated"]} NON-ASSOCIATED THIRD COUNTRIES` },
          };

          // Update radius scale based on new data
          const values = Object.values(dataYear.data);
          let val = values.map(d => d.value);
          if (values.length) {
            radiusScale = d3.scaleSqrt()
              .domain([0, d3.max(val)])
              .range([minRadius, 40]);
          }

          // Clear existing SVG content
          svg.selectAll("*").remove();

          // Recreate the force simulation
          const simulation = d3
            .forceSimulation(values)
            .force("x", d3.forceX(d => d.x).strength(0.5))
            .force("y", d3.forceY(d => d.y).strength(0.5))
            .force("collide", d3.forceCollide(d => radiusScale(d.value) + 2).strength(1))
            .on("tick", ticked);

          // Append new nodes
          const node = svg.selectAll(".bubble")
            .data(values); // Use a unique identifier if possible

          // Enter selection
          const nodeEnter = node.enter().append("g")
            .attr("class", "bubble");

          nodeEnter.append("circle")
            .attr("r", d => radiusScale(d.value))
            .attr("fill", d => categories[d.category].color)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5);

          nodeEnter.append("text")
            .attr("class", "text")
            .attr("dy", "-0.2em")
            .style("font-size", "10px")
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .text(d => d.value);

          nodeEnter.append("text")
            .attr("class", "text")
            .attr("dy", "1em")
            .style("font-size", "10px")
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .text(d => d.country);

          // Update existing nodes
          node.merge(nodeEnter).select("circle")
            .attr("r", d => radiusScale(d.value))
            .attr("fill", d => categories[d.category].color);

          // Remove old lines and append new lines
          node.selectAll("line").remove();
          const bubbles = svg.selectAll(".bubble");
          bubbles.each(function(d) {
            const numLines = d.value;
            const radius = radiusScale(d.value);
            const innerRadius = radius * 0.7;
            const outerRadius = radius * 0.9;
            const angleStep = (2 * Math.PI) / numLines;

            // Select all lines within this node and bind new data
            const lines = d3.select(this).selectAll("line")
              .data(d3.range(numLines), (line, index) => index);

            // Enter selection: Append new lines
            lines.enter()
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

          // Add legend
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
                .style("opacity", opacity);
              svg
                .selectAll(`text[fill="${categories[d].color}"]`)
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
          svg.append("text")
            .attr("class", "legend-details")
            .attr("x", width / 2)
            .attr("y", height - 10)
            .attr("text-anchor", "middle")
            .text(`${selectedYear} - ${dataYear.total_countries} Countries - ${dataYear.total} Partners`)
            .style("font-size", "12px")
            .attr("fill", "gray");

          function ticked() {
            svg.selectAll(".bubble")
              .attr("transform", d => `translate(${d.x},${d.y})`);
          }
        }
      }

      function buildHorizontalBarChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Extract unique years and categories from the new data structure
        const years = Object.keys(data);
        const categories = [...new Set(Object.values(data).flatMap(Object.keys))];
        const latestYear = years[years.length - 1];

        const margin = {top: 20, right: 30, bottom: 80, left: 200},
          width = 1100 - margin.left - margin.right,
          height = 200 + categories.length * 20 - margin.top - margin.bottom,
          maxWidth = 25; // Set your maximum bar width here

        // Colors for the years
        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
        };

        const svg = d3
        .select("#" + wrapperId + ' .indicator-scrollable-container .indicator-container')
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
;

        const y = d3
        .scaleBand()
        .domain(categories)
        .range([0, height])
        .padding(0.2);

        const x = d3
        .scaleLinear()
        .domain([
          0,
          d3.max(Object.values(data), (yearData) =>
            d3.max(Object.values(yearData), (value) => +value) * 1.1
          ),
        ])
        .nice()
        .range([0, width]);

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
          .attr("class", (d) => `bar${years.indexOf(d.year)}`)
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
      }

      function buildVerticalBarChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Extract unique years and categories from the new data structure
        const years = Object.keys(data);
        const categories = [...new Set(Object.values(data).flatMap(Object.keys))];
        const latestYear = years[years.length - 1];

        const margin = {top: 20, right: 30, bottom: 110, left: 50},
          width = 1100 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

        // Colors for the years
        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
        };

        const svg = d3
        .select("#" + wrapperId + ' .indicator-scrollable-container .indicator-container')
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

        // Function to update the chart based on the selected year
        function updateChart(selectedYear) {
          const bars = svg.selectAll(".bar-group").data(categories);

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

        svg.append("g").call(d3.axisLeft(y));

        svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

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
        .data(years.map((year) => ({year, color: colors[year]})))
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
      }

      function buildRadialChart(wrapperId, chartData) {
        const data = chartData.chart;
        const width = 250;
        const height = 250;
        const innerRadius = 60;
        const outerRadius = Math.min(width, height) / 2 - 35;
        const numLines = 100;
        const margin = {top: 20, bottom: 10};

          // Extract unique years from the new data structure
        const years = Object.keys(chartData.chart);
        const latestYear = years[years.length - 1];

        // Extract categories from the first year (assuming all years have the same categories)
        const categories = Object.keys(data[latestYear]);

        // Colors for the years
        const colors = {
          2022: "#017365",
          2023: "#E4798B",
          2024: "#1879EB",
          2025: "#2DC9B6",
          2026: "#C0A456",
          2027: "#7D2D9C",
          2028: "#DB5749",
        };

        const svg = d3
        .select("#" + wrapperId + ' .indicator-scrollable-container .indicator-container')
        .selectAll(".radial-chart")
        .data(categories)
        .enter()
        .append("svg")
        .attr("class", "radial-chart")
        .attr("width", width)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2 + margin.top})`);

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
            for (let j = 0; j < linesToColor; j++) {
              d3.select(this)
              .append("line")
              .attr("class", `line colored value${year}`)
              .attr("x1", innerRadius * Math.cos(angle * j))
              .attr("y1", innerRadius * Math.sin(angle * j))
              .attr("x2", outerRadius * Math.cos(angle * j))
              .attr("y2", outerRadius * Math.sin(angle * j))
              .attr("stroke", colors[year])
              .style("opacity", year === latestYear ? 1 : 0); // Show only the latest year by default
            }

            // Add value label
            const midAngle = angle * linesToColor;
            const labelX = (outerRadius + 18) * Math.cos(midAngle);
            const labelY = (outerRadius + 18) * Math.sin(midAngle);
            d3.select(this)
            .append("text")
            .attr("class", `label-${year}`)
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("dy", "0.35em")
            .text(`${data[year][category]}%`)
            .attr("fill", colors[year])
            .style("font-size", "12px")
            .attr("text-anchor", midAngle > Math.PI ? "end" : "start")
            .style("opacity", year === latestYear ? 1 : 0); // Show only the latest year by default
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
        .data(years.map((year) => ({year, color: colors[year]})))
        .enter()
        .append("div")
        .on("click", function (event, d) {
          // Hide all years
          years.forEach((year) => {
            d3.selectAll(`.indicator-container .line.value${year}`)
            .style("opacity", 0);
            d3.selectAll(`.indicator-container .label-${year}`).style("opacity", 0);
          });

          // Show the selected year
          d3.selectAll(`.indicator-container .line.value${d.year}`)
          .style("opacity", 1);
          d3.selectAll(`.indicator-container .label-${d.year}`).style("opacity", 1);
        });

        legend
        .append("span")
        .attr("class", "legend-color")
        .style("background-color", (d) => d.color);

        legend
        .append("span")
        .attr("class", (d) => "legend-text year-" + d.year)
        .text((d) => d.year);

        d3.selectAll(".category-label").call(wrap, innerRadius + 20);

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

      function addPlayButtonToLegend(selector, wrapperId) {
        const legendContainer = $(selector);

        // SVG markup for the play button
        const playButtonSvg = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7L8 5z" fill="currentColor"/>
          </svg>`
        ;

        // Create button with SVG play icon
        const playButton = $('<button>')
        .addClass('play-button')
        .css({
          'background-color': 'transparent',
          'border': 'none'
        })
        .attr('data-chart-id', wrapperId)
        .on('click', handlePlayButtonClick)
        .html(playButtonSvg); // Insert SVG as the button's content

        legendContainer.prepend(playButton); // Insert the play button as the first child
      }

      function handlePlayButtonClick() {
        const chartId = $(this).data('chart-id');

        const legendItems = $(`#${chartId} .legend > div`);
        legendItems.each((index, item) => {
          setTimeout(() => {
            $(item).trigger('click');
            // $(item).closest('legend').find('.active').removeClass('active');
            // $(item).addClass('active');
          }, index * 2000);
        });
      }


    },
  };
})(jQuery, Drupal, once, drupalSettings);
