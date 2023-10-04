/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.bootstrapTooltip = {
    attach: function (context, settings) {
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
      var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new Tooltip(tooltipTriggerEl)
      })
    }
  };
})(jQuery, Drupal, once);
