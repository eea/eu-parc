/**
 * @file
 * Scroll to the project teaser on mobile.
 */

(function ($, Drupal, once, drupalSettings) {
  Drupal.behaviors.openProjectTeaser = {
    attach: function (context) {
      $(document).ready(function () {
        let logoClick = false;

        if ($(window).width() < 1200) {
          var logo = $(once('parcProjectsMobileSvg', '#parc-projects-mobile-svg'));
          var originalLogoWidth = logo.width();
          var minLogoWidth = 55;
          logo.click(function () {
            logoClick = true;
            if (!$(this).hasClass('resized')) {
              $(this).css('max-width', minLogoWidth);
              $(this).addClass('resized');
            }
            else {
              $(this).css('max-width', '');
              $(this).removeClass('resized');
            }
            setTimeout(function () {
              logoClick = false;
            }, 400, logoClick);
          });

          var lastScroll;
          var scrollDiff;
          var lastScrollDiff;

          let header = $('.mobile-projects header');
          let view = $('.projects-mobile-view');

          $(window).scroll(function(e){
            var scroll = $(this).scrollTop();
            lastScrollDiff = scrollDiff;
            scrollDiff = scroll - lastScroll;
            if (lastScrollDiff == -scrollDiff
              || Math.abs(Math.abs(lastScrollDiff) - Math.abs(scrollDiff)) == 1) {
              return;
            }

            if (logoClick) {
              return;
            }

            if (scroll > 0) {
              var newWidth = Math.max(originalLogoWidth - scroll * 1.2, minLogoWidth);
              logo.css('max-width', newWidth);
              logo.addClass('resized');
            } else {
              logo.css('max-width', '');
              logo.removeClass('resized');
            }
            scrollDiff = scroll - lastScroll;
            lastScroll = scroll;

            var header_bottom = header.position().top + header.outerHeight();
            var view_top = view.position().top;
            // if (view_top < header_bottom && header_bottom < 600) {
            //   view.css('margin-top', header_bottom - view_top + 'px');
            // }
            // else {
            //   view.css('margin-top', '');
            // }
          });

          let nid = drupalSettings.parc.current_project ?? {};
          if (nid) {
            $(once('openProjectTeaser', 'article[data-nid="' + nid + '"]', context)).each(function () {
              let collapse = $(this).find('.collapse');
              $('html, body').animate({
                scrollTop: $(this).offset().top - 50 - header.outerHeight()
              }, 300);

              if (collapse) {
                collapse.collapse('show');
              }
            });
          }
        }
      });
    }
  };
})(jQuery, Drupal, once, drupalSettings);
