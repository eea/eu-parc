/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.bootstrapPopover = {
    attach: function (context, settings) {
      var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
      var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new Popover(popoverTriggerEl, {
          html: popoverTriggerEl.getAttribute('data-bs-html') == 'true',
        })
      })
    }
  };
})(jQuery, Drupal, once);
