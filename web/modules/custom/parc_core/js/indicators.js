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
        const data = chartData.chart;
        const wrapperId = wrapper.attr('id');
        const buildFunctions = {
          'map': buildMapChart,
          'horizontal_bar': buildHorizontalBarChart,
          'vertical_bar': buildVerticalBarChart,
          'radial': buildRadialChart,
        };

        const buildFunction = buildFunctions[chartType];
        buildFunction(wrapperId, chartData);
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

        // Extract unique years from the data
        const years = [...new Set(data.flatMap(d => Object.keys(d.data)))];
        const yearCount = years.length;
        const barsCount = yearCount * data.length;

        const margin = { top: 20, right: 30, bottom: 40, left: 150 },
          width = 1250 - margin.left - margin.right,
          height = 150 + barsCount * 20 - margin.top - margin.bottom;

        const svg = d3
        .select("#" + wrapperId)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

        const y = d3
        .scaleBand()
        .domain(data.map((d) => d.category))
        .range([0, height])
        .padding(0.2);

        const x = d3
        .scaleLinear()
        .domain([
          0,
          d3.max(data, (d) => {
            return d3.max(Object.values(d.data), d => +d) * 1.1
          })
        ])
        .nice()
        .range([0, width]);

        const bars = svg
        .append("g")
        .selectAll("g")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(0,${y(d.category)})`)
        .selectAll("rect")
        .data((d) =>
          Object.keys(d.data).map((key) => ({ key: key, value: d.data[key] }))
        )
        .enter()
        .append("rect")
        .attr(
          "y",
          (d, index) => y.bandwidth() * index / yearCount
        )
        .attr("x", 0)
        .attr("width", (d) => x(d.value))
        .attr("height", y.bandwidth() / yearCount)
        .attr("class", (d, index) => `bar${index}`)
        .attr("rx", 10) // Rounded corners
        .attr("ry", 10); // Rounded corners

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
          // Toggle the active class
          const active = d3.select(this).classed("active");
          d3.select(this).classed("active", !active);

          // Filter bars based on active status
          svg
          .selectAll(`.${event.target.classList[0]}`)
          .transition()
          .style("opacity", active ? 1 : 0);
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

        // Extract unique years from the data
        let years = [...new Set(data.flatMap(d => Object.keys(d.data)))];
        const yearCount = years.length;

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
        .domain(data.map((d) => d.category))
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
          d3.max(data, (d) => d3.max(Object.values(d.data), d => +d))
        ])
        .nice()
        .range([height, 0]);

        const bars = svg
        .append("g")
        .selectAll("g")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x0(d.category)},0)`)
        .selectAll("rect")
        .data((d) =>
          Object.keys(d.data).map((key) => ({ key: key, value: d.data[key] })).reverse()
        )
        .enter()
        .append("rect")
        .attr("x", (d) => x1(0))
        .attr("y", (d) => y(d.value))
        .attr("width", Math.min(x0.bandwidth(), 30))
        .attr("height", (d) => height - y(d.value))
        .attr("class", (d, index) => `bar${yearCount - index - 1}`)
        .attr("rx", 10) // Rounded corners
        .attr("ry", 10); // Rounded corners

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
          // Toggle the active class
          const active = d3.select(this).classed("active");
          d3.select(this).classed("active", !active);

          // Filter bars based on active status
          svg
          .selectAll(`.${event.target.classList[0]}`)
          .transition()
          .style("opacity", active ? 1 : 0);
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

        // Extract unique years from the data
        let years = [...new Set(data.flatMap(d => Object.keys(d.data)))];
        years = years.reverse();

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
        .data(data)
        .enter()
        .append("svg")
        .attr("class", "radial-chart")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

        const angle = 2 * Math.PI / numLines;

        // Generate lines
        svg.each(function(d) {
          const g = d3.select(this);
          for (let i = 0; i < numLines; i++) {
            g.append("line")
            .attr("class", "line")
            .attr("x1", innerRadius * Math.cos(angle * i))
            .attr("y1", innerRadius * Math.sin(angle * i))
            .attr("x2", outerRadius * Math.cos(angle * i))
            .attr("y2", outerRadius * Math.sin(angle * i))
            .attr("stroke", '#E9E9E9')
            ;
          }
        });

        // Color the lines based on values and add labels
        svg.each(function(d) {
          years.forEach((year, index) => {
            const linesToColor = Math.round((d.data[year] / 100) * numLines);
            for (let j = 0; j < linesToColor; j++) {
              d3.select(this).append("line")
              .attr("class", `line colored value${year}`)
              .attr("x1", innerRadius * Math.cos(angle * j))
              .attr("y1", innerRadius * Math.sin(angle * j))
              .attr("x2", outerRadius * Math.cos(angle * j))
              .attr("y2", outerRadius * Math.sin(angle * j))
              .attr("stroke", colors[year]);
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
            .text(`${d.data[year]}%`)
            .attr("fill", colors[year])
            .style("font-size", "12px")
            .attr("text-anchor", midAngle > Math.PI ? "end" : "start");
          });
        });

        svg.append("text")
        .attr("class", "category-label")
        .text(d => d.category)
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
          const active = d3.select(this).classed("active");
          d3.select(this).classed("active", !active);
          const opacity = active ? 1 : 0;
          d3.selectAll(`.line.value${d.year}`).transition().style("opacity", opacity);
        });

        legend.append("span")
        .attr("class", "legend-color")
        .style("background-color", d => d.color);

        legend.append("span")
        .attr("class", "legend-text")
        .text(d => d.year);

        d3.selectAll(".category-label").call(wrap, innerRadius + 20);

        function wrap(text, width) {
          text.each(function() {
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