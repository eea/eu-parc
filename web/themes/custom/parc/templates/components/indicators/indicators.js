(function ($, Drupal, once) {
  Drupal.behaviors.menuSidebarDropdown = {
    attach: function (context, settings) {
      function download(href, name) {
        let a = document.createElement('a');
        a.download = name;
        a.href = href;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      $(once('download', '.download-image-button')).on('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      let button = $(this);
      let svgs = [];

      button.closest('.container').siblings('.indicator-chart__wrapper').find('div[data-once="legendClick"]').each(function () {
        let legendDiv = $(this);
        legendDiv.click();

        let year = legendDiv.find('.legend-text').text();
        let svg = legendDiv.closest('.indicator-chart__wrapper').find('.indicator-container svg').clone();
        if (svg.length > 0) {
          svg.find('.bar1').attr('fill', '#e4798b');
          svg.find('.bar0').attr('fill', '#017365');
          if (svg.hasClass('radial-chart')) {
            svg.find('.colored').each(function () {

              if ($(this).hasClass('value'+year)){
                $(this).css('display', 'block');
                $(this).css('stroke-width', '2px');
                $(this).css('stroke-linecap', 'round');
                $(this).css('opacity', '1');
              }
              else{

                $(this).css('display', 'none');
              }

            });
            svg.find('text').each(function () {

              $(this).css('text-anchor', 'middle');
              let opacity = $(this).css('opacity');

              if (opacity == '1') {
                $(this).css('display', 'block')
            }
            else{
              $(this).css('display', 'none');
            }
            });
        }
          svg.each(function() {
            $(this).attr('data-year', year);
            svgs.push(this);
          });

        } else {
          console.error("Can't find the SVG");
        }
      });

      if (svgs.length === 0) {
        console.error("No SVGs found");
        return;
      }
      let groupedSvgs = {};
      svgs.forEach(svg => {
        let year = svg.getAttribute('data-year');
        if (!groupedSvgs[year]) {
          groupedSvgs[year] = [];
        }
        groupedSvgs[year].push(svg);
      });
      let totalHeight = 0;
      let maxWidth = 0;

      svgs.forEach(svg => {
        totalHeight += svg.height.baseVal.value;
        if (svg.clientWidth > maxWidth) {
          maxWidth = svg.clientWidth;
        }
      });

      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      canvas.width = maxWidth;
      canvas.height = totalHeight;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);


      function createCanvas(groupedSvgs) {
        const svgWidth = groupedSvgs[2022][0].clientWidth;
        const svgHeight = groupedSvgs[2022][0].height.baseVal.value;
        let maxArraySize = 0;
        Object.values(groupedSvgs).forEach(group => {
            if (group.length > maxArraySize) {
                maxArraySize = group.length;
            }
        });
        const maxPerRow = Math.min(4, maxArraySize);
        const rowHeight = svgHeight;
        let totalRows = 0;
        Object.values(groupedSvgs).forEach(group => {
          const rows = Math.ceil(group.length / maxPerRow);
          totalRows += rows;
        });

        const canvasWidth = maxPerRow * svgWidth;
        const canvasHeight = totalRows * rowHeight;

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let currentY = 0;

        Object.keys(groupedSvgs).forEach(year => {
        const svgGroup = groupedSvgs[year];
        svgGroup.forEach((svg, index) => {
            let svgData = new XMLSerializer().serializeToString(svg);
            let img = new Image();
            let row = Math.floor(index / maxPerRow);
            let col = index % maxPerRow;
            let yPosition = currentY + row * rowHeight;

            img.onload = function () {
                ctx.drawImage(img, col * svgWidth, yPosition);
                if (index === svgGroup.length - 1 && year === Object.keys(groupedSvgs).pop()) {
                    download(canvas.toDataURL("image/png"), 'downloaded-image.png');
                }
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        });
        currentY += Math.ceil(groupedSvgs[year].length / maxPerRow) * rowHeight;
        });
      }

      createCanvas(groupedSvgs);
    });




      $(once('legendClick', '.legend > div')).each(function () {
        $(this).click(function () {
          $(this).closest('.legend').find('.active').removeClass('active');
          $(this).addClass('active');
        });
      });

      $(once('download-data', '.download-data-button')).on('click', function (event) {
        event.preventDefault();
        let chart_id = $(this).closest('.container').siblings('.indicator-chart__wrapper').find('.indicator-chart').data('chart-id');

        $.ajax({
          url: '/indicators/' + chart_id + '/download-data',
          type: 'GET',
          xhrFields: {
            responseType: 'blob'
          },
          success: function (data, status, xhr) {
            const blob = new Blob([data], {type: 'text/csv'});
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.csv';

            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);
          },
          error: function (xhr, status, error) {
            console.error('Error downloading the file:', error);
          }
        });
      })

      $(document).on('click', '.copy-link-button', function (event) {
        event.preventDefault();
        var btn = $(this);
        var copyText = $(this).attr('href');

        btn.addClass('added');
        setTimeout(function () {
          btn.removeClass('added');
        }, 1000);

        let copy_link = $(this).attr('href');
        let baseUrl = window.location.origin;
        let url = `${baseUrl}${copy_link}`;
        const copyContent = async () => {
          try {
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(url);
            } else {
              const textarea = document.createElement('textarea');
              textarea.value = url;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          } catch (err) {
            console.error('Failed to copy: ', err);
          }
        }

        copyContent();
      });
    }
  };
})(jQuery, Drupal, once);
