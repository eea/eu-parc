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
        const filename = $(this).closest('.indicator').data("filename");
        let year = $(this).closest('.indicator-description').siblings(".indicator-chart__wrapper").find(".active .legend-text").text();

        if(!year) {
          year = new Date().getFullYear();
        }

        let svg = $(this).closest('.container').siblings('.indicator-chart__wrapper').find('.indicator-container svg');

        svg.css('font-family', '"Satoshi",sans-serif');

        svg.find('.bar1').attr('fill', '#e4798b');
        svg.find('.bar0').attr('fill', '#017365');
        if (svg.hasClass('radial-chart')) {

          svg.find('text').each(function () {

            $(this).css('text-anchor', 'middle');
          });
        }

        svg = svg.toArray();
        if (!svg) {
          console.error("Can't find the SVG");
          return;
        }

        let canvas = document.createElement('canvas');
        let totalSVGs = svg.length;

        let columns = totalSVGs < 4 ? totalSVGs : 4;
        let rows = totalSVGs > 0 ? Math.ceil(totalSVGs / columns) : 0;

        canvas.width = svg[0].clientWidth * columns;
        canvas.height = svg[0].clientHeight * rows;
        let ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        svg.forEach((svgElement, i) => {

          let img = new Image();
          let svgData = new XMLSerializer().serializeToString(svgElement);



          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

          img.onload = function () {
            ctx.drawImage(
              img,
              (i % columns) * svgElement.clientWidth,
              Math.floor(i / columns) * svgElement.clientHeight,
              svgElement.clientWidth,
              svgElement.clientHeight
            );

            if (i === totalSVGs - 1) {

              download(canvas.toDataURL('image/png'), filename + '-' + year);
            }
          };

          img.onerror = function () {
            console.error('Error loading SVG image:', svgData);
          };
        });

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

  Drupal.behaviors.timelineAnimation = {
    attach: function (context, settings) {
      // Initially hide all timeline elements
      $(once('hideTimeline', '.indicators-timeline', context)).each(function () {
        $(this).find('.column > *').addClass('visibility-hidden'); // Ensure elements are hidden
      });

      // Create an Intersection Observer for lazy loading
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Get all columns and reverse their child elements
            $(entry.target).find('.column').each(function () {
              let idx = 1; // Initialize the index for staggered timing
              $($(this).find('> *').get().reverse()).each(function () {
                let el = $(this);
                setTimeout(function () {
                  el.removeClass('visibility-hidden'); // Remove hidden class
                }, idx * 50, el);
                idx++;
              });
            });

            // Stop observing once the animation has started
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: null, // Use the viewport as the root
        rootMargin: '0px',
        threshold: 0.6 // Trigger when at least 10% of the element is visible
      });

      // Observe each timeline element
      $(context).find('.indicators-timeline').each(function () {
        observer.observe(this); // Start observing the timeline element
      });
    }
  };
})(jQuery, Drupal, once);
