/**
 * @file
 * Accordion behaviour for sub-level menu dropdowns (mm-collapse-1 and deeper).
 */

(function ($, Drupal, once) {
  Drupal.behaviors.menuMainAccordion = {
    attach: function (context, settings) {
      $(once('menu-main-accordion', '.region-nav-main', context)).on('show.bs.collapse', function (e) {
        var opening = e.target;
        var levelMatch = opening.className.match(/\bmm-collapse-(\d+)\b/);
        if (!levelMatch || levelMatch[1] === '0') return;

        var levelClass = 'mm-collapse-' + levelMatch[1];
        var $parentLi = $(opening).parent();
        var $parentUl = $parentLi.parent();

        $parentUl.children('li').each(function () {
          if (this === $parentLi[0]) return;
          $(this).find('.' + levelClass + '.show').collapse('hide');
        });
      });
    }
  };
})(jQuery, Drupal, once);
