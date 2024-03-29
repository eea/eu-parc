/**
 * @file
 * Scroll to the project teaser on mobile.
 */

(function ($, Drupal, once, drupalSettings) {
  Drupal.behaviors.openProjectTeaser = {
    attach: function (context) {
      $(document).ready(function () {
        let logoClick = false;

        var logo = $('#parc-projects-mobile-svg');
        var originalLogoWidth = logo.width();
        var minLogoWidth = 55;
        logo.click(function () {
          if ($(this).hasClass('resized')) {
            logoClick = true;
            $(this).css('max-width', '');
            $(this).removeClass('resized');
            setTimeout(function () {
              logoClick = false;
            }, 400, logoClick);
          }
        });

        let header = $('.mobile-projects header');
        let view = $('.projects-mobile-view');

        $(window).scroll(function(e){
          if (logoClick) {
            return;
          }

          logo.css('max-width', minLogoWidth);
          logo.addClass('resized');

          var header_bottom = header.position().top + header.outerHeight();
          var view_top = view.position().top;
        });

        let nid = drupalSettings.parc?.current_project ?? {};
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
      });

      $(once('projectsSvgClick', '#parc-projects-mobile-svg [data-topics]')).each(function () {
        $(this).click(function () {
          if ($(this).closest('svg').hasClass('resized')) {
            return;
          }
          let element = $('article[data-topics="' + $(this).attr('data-topics') + '"]').first();
          $('html, body').animate({
            scrollTop: element.offset().top - 550,
          }, 1000);
        });
      });
    }
  };
})(jQuery, Drupal, once, drupalSettings);
