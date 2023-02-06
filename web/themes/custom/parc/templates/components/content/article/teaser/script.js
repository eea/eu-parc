/**
 * @file
 * Description.
*/

(function ($, Drupal, once) {
  Drupal.behaviors.general = {
    attach: function (context, settings) {
      $('.node--article--teaser .mini-content').on('show.bs.collapse', function () {
        $(this).parent().addClass('mini');
      });
      $('.node--article--teaser .mini-content').on('hide.bs.collapse', function () {
        $(this).parent().removeClass('mini');
      });
    }
  };
})(jQuery, Drupal, once);
