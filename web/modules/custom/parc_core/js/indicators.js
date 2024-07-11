(function ($, Drupal, once, drupalSettings) {

  Drupal.behaviors.indicatorCharts = {
    attach: function (context, settings) {
      $(once('indicatorChart', '[data-chart-type]')).each(function () {
        const chartType = $(this).data('chart-type');
        const id = $(this).data('chart-id');
        const chartData = drupalSettings.parc_core?.indicator_data[id];

        if (!chartData) {
          return;
        }

        buildIndicatorChart($(this), chartType, chartData);
      });

      function buildIndicatorChart(wrapper, chartType, chartData) {
        const wrapperId = wrapper.attr('id');
        const buildFunctions = {
          'map': buildMapChart,
          'horizontal_bar': buildHorizontalBarChart,
          'vertical_bar': buildVerticalBarChart,
          'radial': buildRadialChart,
          'group_pie': buildGroupPieChart,
          'pie': buildPieChart,
          'classic_pie': buildClassicPieChart,
        };

        const buildFunction = buildFunctions[chartType];
        buildFunction(wrapperId, chartData);
      }

      function buildClassicPieChart(wrapperId, chartData){
        let year='2023';
        const data = chartData.chart[year];
        const colors = {
          "2022": "#017365",
          "2023": "#E4798B",
          "2024": "#1879EB",
          "2025": "#2DC9B6",
          "2026": "#C0A456",
          "2027": "#7D2D9C",
          "2028": "#DB5749",
        };
        const colorHex = colors[year]; // Hex color for the specified year

        // Function to convert hex color to RGBA with specified opacity
        function hexToRGBA(hex, opacity) {
          hex = hex.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const adjustedOpacity = opacity < 0.10 ? opacity * 4 : opacity;

          return `rgba(${r}, ${g}, ${b}, ${adjustedOpacity})`;
        }





        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = 600 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;
        const radius = Math.min(width, height) / 2 - 80;

        const sortedData = Object.entries(data)
          .sort((a, b) => b[1] - a[1]);

        // Extract sorted categories
        const largestValue = sortedData[0][1];
        const percentages = sortedData.map(([key, value]) => value / largestValue);
        console.log(percentages)



        const svg = d3
          .select(`#${wrapperId}`)
          .append("svg")
          .attr("width", '100%')
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", `translate(${width / 2},${height / 2})`); // Center the pie chart

        // Outer pie chart (for the edges)
        const outerPie = d3.pie()
          .value(d => d.value)
          .sort(null);

        const outerArc = d3.arc()
          .innerRadius(radius - 20)  // Outer radius of the outer pie
          .outerRadius(radius);     // Inner radius of the outer pie

        const outerPieData = outerPie(Object.entries(data).map(([key, value]) => ({
          category: key,
          value: value
        })));

        // Draw the outer pie slices
        svg.selectAll(".outerSlice")
          .data(outerPieData)
          .enter()
          .append("path")
          .attr("class", "outerSlice")
          .attr("d", outerArc)
          .style("stroke", "white")
          .style("fill", (d, i) => hexToRGBA(colorHex, percentages[i]))

          .style("stroke-width",2);

        // Inner pie chart (for the hollowed-out interior)
        const innerPie = d3.pie()
          .value(d => d.value)
          .sort(null);

        const innerArc = d3.arc()
          .innerRadius(0)            // Inner radius of the inner pie
          .outerRadius(radius - 20); // Outer radius of the inner pie (adjust as needed for thickness)

        const innerPieData = innerPie(Object.entries(data).map(([key, value]) => ({
          category: key,
          value: value
        })));

        // Draw the inner pie slices
        svg.selectAll(".innerSlice")
          .data(innerPieData)
          .enter()
          .append("path")
          .attr("class", "innerSlice")
          .attr("d", innerArc)
          .style("fill", "none")        // Transparent fill
          .style("stroke", "black")     // Add black stroke color
          .style("stroke-width", 2);    //




      }

      function buildGroupPieChart(wrapperId, chartData) {
        const data = chartData.chart;
        const width = 1000;
        const height = 800;
        const radius = Math.min(width, height) / 2 - 140;
        const innerRadius = radius / 3; // Set the inner radius for the doughnut chart

        // Extract unique years from the new data structure
        const years = Object.keys(data).reverse();
        const latestYear = years[0];

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
          "2022": "#017365",
          "2023": "#E4798B",
          "2024": "#1879EB",
          "2025": "#2DC9B6",
          "2026": "#C0A456",
          "2027": "#7D2D9C",
          "2028": "#DB5749",
        };

        const svg = d3.select("#" + wrapperId)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

        // Calculate angles for each category
        const arcGenerator = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius);

        const pie = d3.pie()
        .sort(null)
        .value(d => 1); // Each slice is of equal size

        function drawArcs(currentYear) {
          // Clear existing arcs and labels
          svg.selectAll(".arc").remove();
          svg.selectAll("text").remove();

          const arcs = pie(categories.map(cat => data[currentYear][cat]));

          // Draw arcs for each category
          arcs.forEach((arc, index) => {
            const category = categories[index];
            const linesToColor = (data[currentYear][category]);
            arc.startAngle -= Math.PI / 4;
            arc.endAngle -= Math.PI / 4;

            // Draw the colored lines
            const color = categoryColors[index];
            const arcSelection = svg.append("g")
            .attr("class", "arc arc-" + category.split(' ').join('-'))
            .selectAll(".line")
            .data(d3.range(linesToColor))
            .enter()
            .append("line")
            .attr("class", "line colored")
            .attr("x1", (d, i) => {
              const angle = arc.startAngle + (arc.endAngle - arc.startAngle) * (2 * i + 1) / (2 * linesToColor)
              return innerRadius * Math.cos(angle);
            })
            .attr("y1", (d, i) => {
              const angle = arc.startAngle + (arc.endAngle - arc.startAngle) * (2 * i + 1) / (2 * linesToColor)
              return innerRadius * Math.sin(angle);
            })
            .attr("x2", (d, i) => {
              const angle = arc.startAngle + (arc.endAngle - arc.startAngle) * (2 * i + 1) / (2 * linesToColor)
              return radius * Math.cos(angle);
            })
            .attr("y2", (d, i) => {
              const angle = arc.startAngle + (arc.endAngle - arc.startAngle) * (2 * i + 1) / (2 * linesToColor)
              return radius * Math.sin(angle);
            })
            .attr("stroke", color)
            .attr("stroke-linecap", "round")
            .attr("stroke-width", "5px")
            .style("opacity", 1);

            // Add category label just outside the slice
            const outerRadius = radius * 1.15; // Place label just outside the slice
            const labelAngle = (arc.startAngle + arc.endAngle) / 2; // Angle at the middle of the slice
            let anchor = labelAngle <= (Math.PI / 2) || labelAngle >= (3 * Math.PI / 2) ? "start" : "end";
            if (Math.abs(Math.PI / 2 - labelAngle) <= 0.01 || Math.abs(Math.PI * 3 / 2 - labelAngle) <= 0.01) {
              anchor = "middle";
            }

            let labelX = outerRadius * Math.cos(labelAngle);
            let labelY = outerRadius * Math.sin(labelAngle);

            let textObj = svg.append("text")
            .attr("class", `category-label-${category.split(' ').join('-')}`)
            .attr("transform", `translate(${labelX}, ${labelY})`)
            .text(`${category}`)
            .attr("fill", color)
            .style("font-size", "20px")
            .attr("text-anchor", anchor)
            .style("opacity", 1); // Show only the latest year by default

            labelY += 30;
            if (anchor == "start") {
              labelX += (textObj.node().getBBox().width / 2);
            }
            else if (anchor == "end") {
              labelX -= (textObj.node().getBBox().width / 2);
            }
            svg.append("text")
            .attr("class", `category-label-${category.split(' ').join('-')}`)
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

        svg.append("text")
        .attr("class", "category-label")
        .attr("fill", "black")
        .style("font-size", "12px")
        .attr("text-anchor", "middle");

        const legend = d3.select("#" + wrapperId)
        .append("div")
        .attr("class", "legend")
        .selectAll("div")
        .data(years.map(year => ({ year, color: colors[year] })))
        .enter()
        .append("div")
        .on("click", function(event, d) {
          const year = d.year;
          drawArcs(year);
        });

        legend.append("span")
        .attr("class", "legend-color")
        .style("background-color", d => d.color);

        legend.append("span")
        .attr("class", "legend-text")
        .text(d => d.year);

        function wrap(text, width) {
          // Function to wrap text if needed
        }
      }

      function buildPieChart(wrapperId, chartData) {
          const colors = {
            "2022": "#017365",
            "2023": "#E4798B",
            "2024": "#1879EB",
            "2025": "#2DC9B6",
            "2026": "#C0A456",
            "2027": "#7D2D9C",
            "2028": "#DB5749",
          };
          function chart(year){
            const data = chartData.chart[year]; // Extract data for the year 2022

            // Dimensions and margins
            const margin = { top: 20, right: 20, bottom: 20, left: 20 };
            const width = 600 - margin.left - margin.right;
            const height = 600 - margin.top - margin.bottom;
            const radius = Math.min(width, height) / 2-80;

            // Color scale
            const colors = ["#E1C268", "#008474", "#1C74FF", "#F58296", "#8631A7", "#E0BAFF"];
            const color = d3.scaleOrdinal()
              .domain(Object.keys(data))
              .range(colors);
            // Create SVG element
            const svg = d3
              .select(`#${wrapperId}`)
              .append("svg")
              .attr("width", '100%')
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", `translate(${ width },${height / 2 + margin.top})`); // Adjusted for margins

            // Prepare data for pie layout
            const pie = d3.pie()
              .value(d => d.value)
              .sort(null);

             const pieData = pie(Object.entries(data).map(([key, value]) => ({
              category: key,
              value: value
            })));

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
                svg.append("line")
                  .attr("x1", x1)
                  .attr("y1", y1)
                  .attr("x2", x2)
                  .attr("y2", y2)
                  .attr("stroke", color(i))
                  .attr("stroke-width", 6)
                  .attr("stroke-linecap", 'round');

                // Add label at the end of the first line in each category
                // svg.append("text")

                if (j === 0) {
                  const angleInDegrees = angle * (180 / Math.PI); // Convert angle to degrees
                  const x = outerRadius * Math.cos(angle);
                  const y = outerRadius * Math.sin(angle);
                  const gapX = x2 + (Math.cos(angle) * gapLength);
                  const gapY = y2 + (Math.sin(angle) * gapLength);
                  const labelLineLength = 20; // Length of the connecting line
                  const labelX = gapX + (Math.cos(angle) * labelLineLength);
                  const labelY = gapY + (Math.sin(angle) * labelLineLength);
                  rotationAngle = angleInDegrees;
                  if (angle > Math.PI) {
                    rotationAngle += 180; // Rotate by 180 degrees for second half of the circle (right side)
                  } else {
                    rotationAngle -= 180; // Rotate by -180 degrees for first half of the circle (left side)
                  }

                  const label = svg.append("text")
                    .attr("transform", `translate(${x}, ${y}) rotate(${rotationAngle})`)
                    .attr("dy", "0.35em")
                    .style("fill", color(i))
                    .html(`${slice.data.value} projects ${slice.data.category}`) // Display number of projects and category name
                    .attr("text-anchor", angle > Math.PI ? "end" : "start");

                  // Wrap the label text
                  wrap(label, 200); // Adjust the width parameter as needed
                  if (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2) {
                    // label.attr("transform", `translate(${x}, ${y}) rotate(${0})`)
                    label.attr("text-anchor", "end");
                  } else {
                    // label.attr("transform", `translate(${x}, ${y}) rotate(${360})`)
                    label.attr("text-anchor", "start");
                  }
                  label.attr("transform", `translate(${x}, ${y}) rotate(${0})`)

                  svg.append("line")
                    .attr("x1", gapX)
                    .attr("y1", gapY)
                    .attr("x2", labelX)
                    .attr("y2", labelY)
                    .attr("stroke", 'black')
                    .attr("stroke-width", 1);

                }

              }
            });

            // Adding the chart's title and additional information
            svg.append("text")
              .attr("x", 0)
              .attr("y", height / 2 + 40)
              .attr("text-anchor", "middle")
              .text(`Number of organizations`)
              .style("font-size", "12px")
              .attr("fill", "gray");
          }

          function handleLegendClick(event, d) {
            // Remove existing SVG
            d3.select(`#${wrapperId} svg`).remove();

            // Remove existing legend
            d3.select(`#${wrapperId} .legend`).remove();

            // Recreate chart for selected year
            chart(d.year);

            // Recreate legend
            const legend = d3.select(`#${wrapperId}`)
              .append("div")
              .attr("class", "legend")
              .selectAll("div")
              .data(years.map(year => ({ year, color: "blue" })))
              .enter()
              .append("div")
              .on("click", handleLegendClick);

            legend.append("span")
              .attr("class", "legend-color")
              .style("background-color", d => colors[d.year]);

            legend.append("span")
              .attr("class", "legend-text")
              .text(d => d.year);
          }

          // Initial call to create the chart for the first year in the data
          const years = Object.keys(chartData.chart).reverse();
          chart(years[0]);

          // Create initial legend
          const legend = d3.select(`#${wrapperId}`)
            .append("div")
            .attr("class", "legend")
            .selectAll("div")
            .data(years.map(year => ({ year, color: "blue" })))
            .enter()
            .append("div")
            .on("click", handleLegendClick);

          legend.append("span")
            .attr("class", "legend-color")
            .style("background-color", d => colors[d.year]);

          legend.append("span")
            .attr("class", "legend-text")
            .text(d => d.year);
        }

      // Function to wrap text within a specified width using <tspan>
      function wrap(text, width) {
        text.each(function () {
          let text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", 0).attr("dy", 0 + "em"),
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
            if (tspanNode.getComputedTextLength() > width || word === "projects") {
              if (word === "projects") {
                // Add the word "projects" to the current line
                tspan.text(line.join(" "));
                line = [];
                // Append a new tspan without any word
                tspan = text.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text("");
              } else {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text(word);
              }
              lineNumber++;
            }
          }
          text.attr("x", 0).attr("y", -lineNumber * lineHeight / 2 + "em");
          firstTspan.attr("dy", -(lineNumber - 1) * lineHeight / 2 + "em");
        });
      }












      function buildMapChart(wrapperId, chartData) {
        const data = chartData.chart;

        const categories = {
          member: { color: "#1f77b4", label: "23 Member States" },
          associated: { color: "#f1c40f", label: "4 Associated Countries" },
          "non-associated": {
            color: "#bdc3c7",
            label: "1 Non-associated Third Countries",
          },
        };

        const margin = { top: 20, right: 20, bottom: 20, left: 20 },
          width = 1250 - margin.left - margin.right,
          height = 800 - margin.top - margin.bottom;

        const svg = d3
        .select('#' + wrapperId)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

        const minRadius = 20; // Minimum radius to ensure text fits
        const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d) => d.value)])
        .range([minRadius, 40]);

        // Initialize force simulation
        const simulation = d3
        .forceSimulation(data)
        .force("x", d3.forceX((d) => d.x).strength(0.5))
        .force("y", d3.forceY((d) => d.y).strength(0.5))
        .force(
          "collide",
          d3.forceCollide((d) => radiusScale(d.value) + 2).strength(1)
        )
        .on("tick", ticked);

        const node = svg
        .selectAll(".bubble")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "bubble");

        node
        .append("circle")
        .attr("r", (d) => radiusScale(d.value))
        .attr("fill", (d) => categories[d.category].color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);

        // Adding radial lines (ticks)
        node.each(function (d) {
          const numLines = d.value;
          const radius = radiusScale(d.value);
          const innerRadius = radius * 0.7; // Inner radius for the ticks (70% of the radius)
          const outerRadius = radius * 0.9; // Outer radius for the ticks (90% of the radius)
          const angleStep = (2 * Math.PI) / numLines;
          const lines = d3
          .select(this)
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

        // Centering text inside the bubbles
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
        .attr("transform", (d, i) => `translate(0,${i * 20})`)
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
          .selectAll(`text[fill="${categories[d].color}"]`)
          .transition()
          .style("opacity", opacity);
        });

        legend
        .append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", (d) => categories[d].color);

        legend
        .append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text((d) => categories[d].label);

        // Adding the legend's title and additional information
        svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .text(`${chartData.year} - ${chartData.countries} Countries - ${chartData.partners} Partners`)
        .style("font-size", "12px")
        .attr("fill", "gray");

        function ticked() {
          node.attr("transform", (d) => `translate(${d.x},${d.y})`);
        }
      }

      function buildHorizontalBarChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Extract unique years and categories from the new data structure
        const years = Object.keys(data);
        const categories = [...new Set(Object.values(data).flatMap(Object.keys))];
        const latestYear = years[years.length - 1];

        const margin = { top: 20, right: 30, bottom: 40, left: 150 },
          width = 1250 - margin.left - margin.right,
          height = 200 + categories.length * 20 - margin.top - margin.bottom,
          maxWidth = 25; // Set your maximum bar width here

        const svg = d3
          .select("#" + wrapperId)
          .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
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
            d3.max(Object.values(data), (yearData) =>
              d3.max(Object.values(yearData), (value) => +value) * 1.1
            ),
          ])
          .nice()
          .range([0, width]);

        // Function to update the chart based on the selected year
        function updateChart(selectedYear) {
          const bars = svg
            .selectAll(".bar-group")
            .data(categories);

          const barsEnter = bars
            .enter()
            .append("g")
            .attr("class", "bar-group")
            .attr("transform", (d) => `translate(0,${y(d)})`);

          barsEnter.merge(bars)
            .selectAll("rect")
            .data((category) => [{
              year: selectedYear,
              value: data[selectedYear][category] || 0,
            }])
            .join("rect")
            .attr("y", 0) // Reset y position to 0
            .attr("x", 0)
            .attr("width", (d) => x(d.value))
            .attr("height", Math.min(y.bandwidth(), maxWidth)) // Set the height of the full band
            .attr("class", (d) => `bar${years.indexOf(d.year)}`)
            .attr("rx", 10) // Rounded corners
            .attr("ry", 10) // Rounded corners
            .attr("transform", function(d) {
              const barWidth = Math.min(y.bandwidth(), maxWidth);
              return `translate(0, ${(y.bandwidth() - barWidth) / 2})`; // Center the bar within its group
            });

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
          .attr("transform", `translate(${width / 2} ,${height + margin.top + 20})`)
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

        const legend = svg
          .selectAll(".legend")
          .data(years)
          .enter()
          .append("g")
          .attr("class", "legend")
          .attr("transform", (d, i) => `translate(0,${i * 20})`)
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            // Update chart to show data for the clicked year
            updateChart(d);
          });

        legend
          .append("rect")
          .attr("x", width - 18)
          .attr("width", 18)
          .attr("height", 18)
          .attr("class", (d, index) => `bar${index}`)
          .attr("rx", 5) // Rounded corners for legend
          .attr("ry", 5); // Rounded corners for legend

        legend
          .append("text")
          .attr("x", width - 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "end")
          .text((d) => d);
      }

      function buildVerticalBarChart(wrapperId, chartData) {
        const data = chartData.chart;

        // Extract unique years and categories from the new data structure
        const years = Object.keys(data);
        const categories = [...new Set(Object.values(data).flatMap(Object.keys))];
        const latestYear = years[years.length - 1];

        const margin = { top: 20, right: 30, bottom: 90, left: 50 },
          width = 1250 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

        const svg = d3
          .select("#" + wrapperId)
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
          const bars = svg
            .selectAll(".bar-group")
            .data(categories);

          const barsEnter = bars
            .enter()
            .append("g")
            .attr("class", "bar-group")
            .attr("transform", (d) => `translate(${x0(d)},0)`);

          const barMaxWidth = 20;
          barsEnter.merge(bars)
            .selectAll("rect")
            .data((category) => [{
              year: selectedYear,
              value: data[selectedYear][category] || 0,
            }])
            .join("rect")
            .attr("x", 0)
            .attr("y", (d) => y(d.value))
            .attr("width", Math.min(barMaxWidth, x0.bandwidth()))
            .attr("height", (d) => height - y(d.value))
            .attr("class", (d) => `bar${years.indexOf(d.year)}`)
            .attr("rx", 10) // Rounded corners
            .attr("ry", 10)  // Rounded corners
            .attr("transform", function(d) {
              const barWidth = Math.min(x0.bandwidth(), barMaxWidth);
              return `translate(${(x0.bandwidth() - barWidth) / 2}, 0)`; // Center the bar within its group
            });

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
          .attr("transform", `translate(${width / 2} ,${height + margin.top + 30})`)
          .style("text-anchor", "middle")
          .text(chartData.label_x);

        const legend = svg
          .selectAll(".legend")
          .data(years)
          .enter()
          .append("g")
          .attr("class", "legend")
          .attr("transform", (d, i) => `translate(0,${i * 20})`)
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            // Update chart to show data for the clicked year
            updateChart(d);
          });

        legend
          .append("rect")
          .attr("x", width - 18)
          .attr("width", 18)
          .attr("height", 18)
          .attr("class", (d, index) => `bar${index}`)
          .attr("rx", 5) // Rounded corners for legend
          .attr("ry", 5); // Rounded corners for legend

        legend
          .append("text")
          .attr("x", width - 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "end")
          .text((d) => d);
      }

      function buildRadialChart(wrapperId, chartData) {
        const data = chartData.chart;
        const width = 250;
        const height = 250;
        const innerRadius = 60;
        const outerRadius = Math.min(width, height) / 2 - 35;
        const numLines = 100;

        // Extract unique years from the new data structure
        const years = Object.keys(data).reverse();
        const latestYear = years[0];

        // Extract categories from the first year (assuming all years have the same categories)
        const categories = Object.keys(data[latestYear]);

        // Colors for the years
        const colors = {
          "2022": "#017365",
          "2023": "#E4798B",
          "2024": "#1879EB",
          "2025": "#2DC9B6",
          "2026": "#C0A456",
          "2027": "#7D2D9C",
          "2028": "#DB5749",
        };

        const svg = d3.select("#" + wrapperId)
          .selectAll(".radial-chart")
          .data(categories)
          .enter()
          .append("svg")
          .attr("class", "radial-chart")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", `translate(${width / 2},${height / 2})`);

        const angle = 2 * Math.PI / numLines;

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
              .attr("stroke", '#E9E9E9');
          }
        });

        // Color the lines based on values and add labels
        svg.each(function (category) {
          years.forEach((year) => {
            const linesToColor = Math.round((data[year][category] / 100) * numLines);
            for (let j = 0; j < linesToColor; j++) {
              d3.select(this).append("line")
                .attr("class", `line colored value${year}`)
                .attr("x1", innerRadius * Math.cos(angle * j))
                .attr("y1", innerRadius * Math.sin(angle * j))
                .attr("x2", outerRadius * Math.cos(angle * j))
                .attr("y2", outerRadius * Math.sin(angle * j))
                .attr("stroke", colors[year])
                .style("opacity", year === latestYear ? 1 : 0); // Show only the latest year by default
            }

            // Add value label
            const midAngle = angle * (linesToColor);
            const labelX = (outerRadius + 18) * Math.cos(midAngle);
            const labelY = (outerRadius + 18) * Math.sin(midAngle);
            d3.select(this).append("text")
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

        svg.append("text")
          .attr("class", "category-label")
          .text(category => category)
          .attr("fill", "black")
          .style("font-size", "12px")
          .attr("text-anchor", "middle");

        const legend = d3.select("#" + wrapperId)
          .append("div")
          .attr("class", "legend")
          .selectAll("div")
          .data(years.map(year => ({ year, color: colors[year] })))
          .enter()
          .append("div")
          .on("click", function (event, d) {
            // Hide all years
            years.forEach(year => {
              d3.selectAll(`.line.value${year}`).transition().style("opacity", 0);
              d3.selectAll(`.label-${year}`).transition().style("opacity", 0);
            });

            // Show the selected year
            d3.selectAll(`.line.value${d.year}`).transition().style("opacity", 1);
            d3.selectAll(`.label-${d.year}`).transition().style("opacity", 1);
          });

        legend.append("span")
          .attr("class", "legend-color")
          .style("background-color", d => d.color);

        legend.append("span")
          .attr("class", "legend-text")
          .text(d => d.year);

        d3.selectAll(".category-label").call(wrap, innerRadius + 20);

        function wrap(text, width) {
          text.each(function () {
            let text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              lineHeight = 1.1, // ems
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy")),
              tspan = text.text(null).append("tspan").attr("x", 0).attr("y", 0).attr("dy", 0 + "em"),
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
                tspan = text.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text(word);
                lineNumber++;
              }
            }
            text.attr("x", 0).attr("y", -lineNumber * lineHeight / 2 + "em");
            firstTspan.attr("dy", -(lineNumber - 1) * lineHeight / 2 + "em");
          });
        }
      }
    }
  }

})(jQuery, Drupal, once, drupalSettings);
