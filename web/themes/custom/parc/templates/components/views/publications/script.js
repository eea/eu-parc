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

            // let left_authors = $(this).find('.authors');
            // let right_authors = pair.find('.authors');
            // left_authors.css('min-height', 0);
            // right_authors.css('min-height', 0);
            // const author_height = Math.max(left_authors.height(), right_authors.height());
            // left_authors.css('min-height', author_height + 'px');
            // right_authors.css('min-height', author_height + 'px');
          }
        });
      }

      $(once('viewPublications', '.views--2col', context)).each(function() {
        setPublicationsHeight($(this));
      });

      $(window).on('resize', function () {
        setPublicationsHeight($('.views--2col'));
      });
    }
  }
})(jQuery, Drupal, once);
