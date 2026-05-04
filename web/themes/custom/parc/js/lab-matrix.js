(function ($, Drupal, once) {
  Drupal.behaviors.labMatrixExpandInfo = {
    attach: function (context, settings) {
      once('labMatrixExpandInfo', 'body', context).forEach(function (body) {
        $(body).on('click', '.additional-info-read-more', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var $cell = $(this).closest('.table-cell');
          var expanded = $cell.toggleClass('expanded').hasClass('expanded');
          $(this).text(expanded ? Drupal.t('Read less') : Drupal.t('Read more'));
        });
      });
    }
  };
})(jQuery, Drupal, once);
