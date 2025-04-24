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
        var percent = parent.attr('data-percent');
        var parentHeight = parent.outerHeight();
        var maxHeight = parentHeight - 10;

        var height = Math.round((percent / 100) * maxHeight);
        $this.attr('style', `max-height: ${height}px`);
      });
    }
  }
})(jQuery, Drupal, once);
