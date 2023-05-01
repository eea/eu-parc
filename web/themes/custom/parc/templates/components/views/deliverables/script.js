/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.viewDeliverables = {
    attach: function (context) {
      const btn = $(context).find('.btn-wp');
      btn.once('viewDeliverables').each(function() {
        var addText = $(this).siblings('.t-term--deliverables').data('ttshort');
        $(this).append(addText);
      }).on('click', function (e) {
        $(this).toggleClass('d-none');
        var item = $(this).siblings('.w--scroll');
        item.toggleClass('g-hide');
      });
    }
  }
})(jQuery, Drupal, once);
