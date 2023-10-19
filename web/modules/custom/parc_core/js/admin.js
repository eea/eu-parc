(function ($, Drupal, once) {

  Drupal.behaviors.parcSmartDate = {
    attach: function (context, settings) {
      $(once('parcSmartDate', '.node-events-form .allday, .node-events-edit-form .allday')).on('change', function () {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('all-day-selected');
        }
        else {
          $(this).closest('tr').removeClass('all-day-selected');
        }
      });

      $(once('initElement', '.node-events-form .allday, .node-events-edit-form .allday')).each(function () {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('all-day-selected');
        }
      });
    }
  }

})(jQuery, Drupal, once);
