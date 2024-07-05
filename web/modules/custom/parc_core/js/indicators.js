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
        switch (chartType) {
          case 'map':
            const categories = {
              member: { color: "#1f77b4", label: "23 Member States" },
              associated: { color: "#f1c40f", label: "4 Associated Countries" },
              "non-associated": {
                color: "#bdc3c7",
                label: "1 Non-associated Third Countries",
              },
            };

            const margin = { top: 20, right: 20, bottom: 20, left: 20 },
              width = 1130 - margin.left - margin.right,
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
          break;
        }
      }
    }
  }

})(jQuery, Drupal, once, drupalSettings);
