(function ($, Drupal, once) {

  Drupal.behaviors.parcSmartDate = {
    attach: function (context, settings) {
      $(once('parcSmartDate', '.node-events-form,.node-events-edit-form')).on('change', '.allday', function () {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('all-day-selected');
        }
        else {
          $(this).closest('tr').removeClass('all-day-selected');
        }
      });

      $(once('parcSmartDateInit', '.node-events-form .allday, .node-events-edit-form .allday')).each(function () {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('all-day-selected');
        }
      });
    }
  }

})(jQuery, Drupal, once);
