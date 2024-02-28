/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.viewPublications = {
    attach: function (context) {
      function setPublicationsHeight(view) {
        let left_col = view.find('.left-col');
        let right_col = view.find('.right-col');

        left_col.find('[data-row]').each(function () {
          let row = $(this).data('row');
          let pair = right_col.find('[data-row="' + row + '"]');
          if (pair) {
            let left_title = $(this).find('.title');
            let right_title = pair.find('.title');
            left_title.css('min-height', 0);
            right_title.css('min-height', 0);
            const title_height = Math.max(left_title.height(), right_title.height());
            left_title.css('min-height', title_height + 'px');
            right_title.css('min-height', title_height + 'px');
          }
        });
      }



      setTimeout(function () {
        const id = window.location.hash;
        if (id) {
          let item1 = $('.left-col ' + id);
          let item2 = $('.right-col ' + id);

          if (window.innerWidth >= 1280 && item2.length) {
            $('html, body').animate({scrollTop: item2.offset().top - 100}, 100);
          }
          else {
            $('html, body').animate({scrollTop: item1.offset().top - 100}, 100);
          }
        }
      }, 1);

      $(once('viewPublications', '.views--2col', context)).each(function() {
        setPublicationsHeight($(this));
      });

      $(window).on('resize', function () {
        setPublicationsHeight($('.views--2col'));
      });
    }
  }
})(jQuery, Drupal, once);
