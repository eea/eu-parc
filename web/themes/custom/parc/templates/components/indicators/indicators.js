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

      function getCleanedSVG(originalSVG) {
        originalSVG.querySelectorAll("a").forEach(aTag => {
            while (aTag.firstChild) {
                aTag.parentNode.insertBefore(aTag.firstChild, aTag);
            }
            aTag.remove();
        });

      }

      $(once('download', '.download-image-button')).on('click', function (event) {
        event.preventDefault();
        const filename = $(this).closest('.indicator').data("filename");
        let year = $(this).closest('.indicator-description').siblings(".indicator-chart__wrapper").find(".active .legend-text").text();

        if(!year) {
          year = new Date().getFullYear();
        }
        let wrapper = $(this).closest('.container').siblings('.indicator-chart__wrapper')
        if(wrapper.find('.indicators-timeline').length>0){
          html2canvas(wrapper.find('.indicators-timeline')[0], {logging: false}).then(canvas => {
            download(canvas.toDataURL('image/png'), filename + '-' + year);
            return;
          }).catch(err => {
            console.error(err);
          });
        }
        else{
          function downloadSVG(sleep=0) {
            setTimeout(function () {
              let svg = wrapper.find('.indicator-container > svg');

              if (svg.length === 0) {
                let scrollToTop = wrapper.offset().top - 100;
                $('html, body').animate({scrollTop: scrollToTop}, 500, downloadSVG(3));
                return;
              }

              svg.css('font-family', '"Satoshi",sans-serif');
              svg.find('.tick').css('font-size', '12px');
              svg.find('.tick').css('letter-spacing', '0.1px');
              svg.find('.axis-label').css('font-size', '14px');
              svg.find('.bar1').attr('fill', '#e4798b');
              svg.find('.bar0').attr('fill', '#017365');

              if (svg.hasClass('radial-chart')) {

                svg.find('text').each(function () {

                  $(this).css('text-anchor', 'middle');
                });
              }
              let cloneSvg, svgArr;
              if (svg.find('a').length > 0) {
                cloneSvg = svg.clone();
                getCleanedSVG(cloneSvg[0]);
                document.body.appendChild(cloneSvg[0]);
              }
              if (cloneSvg) {
                svgArr = cloneSvg.toArray();
              }
              else {
                svgArr = svg.toArray();
              }
              if (!svgArr) {
                console.error("Can't find the SVG");
                return;
              }

              let canvas = document.createElement('canvas');
              let totalSVGs = svgArr.length;
              let columns = totalSVGs < 4 ? totalSVGs : 4;
              let rows = totalSVGs > 0 ? Math.ceil(totalSVGs / columns) : 0;

              canvas.width = svgArr[0].clientWidth * columns;
              canvas.height = svgArr[0].clientHeight * rows;
              let ctx = canvas.getContext('2d');
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              svgArr.forEach((svgElement, i) => {

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
                    if (cloneSvg) {
                      cloneSvg[0].parentNode.removeChild(cloneSvg[0]);
                    }
                  }
                };

                img.onerror = function () {
                  console.error('Error loading SVG image:', svgData);
                };
              });
            }, sleep*1000);

          }
          downloadSVG();
        }
      });

      $(document).on("click", ".legend > div", function(){
        $(this).closest('.legend').find('.active').removeClass('active');
        $(this).addClass('active');
      });

      $(once('download-data', '.download-data-button')).on('click', function (event) {
        event.preventDefault();
        const filename = $(this).closest('.indicator').data("filename");
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
            a.download = filename;

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
      $(once('hideTimeline', '.indicators-timeline', context)).each(function () {
        $(this).find('.column > *').addClass('visibility-hidden');
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            let idx = 1;
            $(entry.target).find('.column').each(function () {
              $($(this).find('> *').get().reverse()).each(function () {
                let el = $(this);
                setTimeout(function () {
                  el.removeClass('visibility-hidden');
                }, idx * 20, el);
                idx++;
              });
            });

            observer.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.6
      });

      $(context).find('.indicators-timeline').each(function () {
        observer.observe(this);
      });
    }
  };

  Drupal.behaviors.hideSecondWord = {
    attach: function (context, settings) {
      $(once('hideSecondWord', '.block-parc-indicators .nav .nav-link', context)).each(function () {
        let text = $(this).text();
        let words = text.split(/(?<=\w)\s(?=\w)/);
        let firstWord = words[0];
        let secondWord = words[1];
        $(this).html(`${firstWord} <span>${secondWord}</span>`);
      })
    }
  };
})(jQuery, Drupal, once);
