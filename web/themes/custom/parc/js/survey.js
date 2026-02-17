/**
 * @file
 * Survey functionality.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.survey = {
    attach: function (context, settings) {
      $(once('survey-result', '.survey-result-percent', context)).each(function () {
        var $this = $(this);
        var parent = $this.parent();

        const updateHeight = () => {
          var percent = parent.attr('data-percent');
          var parentHeight = parent.outerHeight();
          if (parentHeight > 0) {
            var maxHeight = parentHeight - 10;
            var height = Math.round((percent / 100) * maxHeight);
            $this.attr('style', `max-height: ${height}px`);
          }
        };

        // Initial calculation.
        updateHeight();

        // Use ResizeObserver to detect when the parent becomes visible/resized.
        if ('ResizeObserver' in window) {
          const resizeObserver = new ResizeObserver((entries) => {
            // We only need to trigger update, loop optimization handled by browser.
            updateHeight();
          });
          resizeObserver.observe(parent[0]);
        }
      });
    }
  }
})(jQuery, Drupal, once);
