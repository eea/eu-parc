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

        let svg = $(this).closest('.container').siblings('.indicator-chart__wrapper').find('svg').get(0);
        if (!svg) {
          console.error("Can't find the SVG");
          return;
        }

        let svgData = new XMLSerializer().serializeToString(svg);
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let img = new Image();

        canvas.width = svg.clientWidth;
        canvas.height = svg.clientHeight;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        img.onload = function () {
          ctx.drawImage(img, 0, 0);
          download(canvas.toDataURL("image/png"), 'downloaded-image.png');
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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
