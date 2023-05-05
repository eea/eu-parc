(function ($, Drupal, drupalSettings) {

  Drupal.behaviors.parcSmartDate = {
    attach: function (context, settings) {
      $(document).once('parcSmartDate').on('change', '.node-events-form .allday, .node-events-edit-form .allday', function () {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('all-day-selected');
        }
        else {
          $(this).closest('tr').removeClass('all-day-selected');
        }
      });

      $('.node-events-form .allday, .node-events-edit-form .allday').once('initElement').each(function () {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('all-day-selected');
        }
      });
    }
  }

})(jQuery, Drupal, drupalSettings);
