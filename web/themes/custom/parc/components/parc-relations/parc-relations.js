(function ($, Drupal, once, drupalSettings) {

  Drupal.behaviors.parcProjectTitle = {
    attach: function (context, settings) {
      var left_count;
      var right_count;

      var relations = settings?.parc_relations ?? {};

      var div_spacing = 30;

      function drawRelations() {
        $.each(relations, function (key, data) {
          var $wrapper = $(`[data-wrapper="${key}"]`);
          if (!$wrapper.is(':visible')) {
            return;
          }

          left_count = 0;
          right_count = 0;

          $.each(data.left, function (idx, item) {
            drawCurve(key, item.id, 'left');
          });
          $.each(data.right, function (idx, item) {
            drawCurve(key, item.id, 'right');
          });
        });
      }

      function drawCurve(identifier, term, type) {
        let title_div = $(`[data-wrapper="${identifier}"] .parc-relations__title__inner`);
        let term_div = $(`[data-wrapper="${identifier}"] div[data-item="${term}"]`);
        let path_element = $(`[data-wrapper="${identifier}"] path[data-item="${term}"]`);

        if (!title_div.length || !term_div.length || !path_element.length) {
          return;
        }

        // Ensure parent has position: relative if needed, but jQuery .position() is relative to offset parent
        let startX;
        let startY;
        let endX;
        let endY;
        let spacing;
        let total;

        if (type == 'left') {
          left_count++;
          spacing = 10;
          endX = title_div.position().left - div_spacing;
          endY = title_div.position().top + title_div.outerHeight() / 2;
          total = relations[identifier][type].length;
          endY -= ((total + 1) / 2 - left_count) * spacing;

          startX = term_div.position().left + div_spacing;
          startX += term_div.outerWidth();

          startY = term_div.position().top + term_div.outerHeight() / 2;
        } else {
          right_count++;
          spacing = 10;
          startX = title_div.position().left + div_spacing;
          startX += title_div.outerWidth();

          startY = title_div.position().top + title_div.outerHeight() / 2;
          total = relations[identifier][type].length;
          startY -= ((total + 1) / 2 - right_count) * spacing

          endX = term_div.position().left - div_spacing;
          endY = term_div.position().top + term_div.outerHeight() / 2;
        }

        // https://stackoverflow.com/questions/45240401/svg-path-create-a-curvy-line-to-link-two-points
        // M
        var AX = startX;
        var AY = startY;

        // L
        var BX = Math.abs(endX - startX) * 0.01 + startX;
        var BY = startY;

        // C
        var CX = (endX - startX) * 0.75 + startX;
        var CY = startY;
        var DX = (endX - startX) * 0.25 + startX;
        var DY = endY;
        var EX = -Math.abs(endX - startX) * 0.01 + endX;
        var EY = endY;

        // L
        var FX = endX;
        var FY = endY;

        var path = 'M' + AX + ',' + AY;
        path += ' L' + BX + ',' + BY;
        path += ' ' + 'C' + CX + ',' + CY;
        path += ' ' + DX + ',' + DY;
        path += ' ' + EX + ',' + EY;
        path += ' L' + FX + ',' + FY;

        path_element.attr('d', path);
      }

      // Intersection Observer to detect when relations become visible (e.g. accordion open)
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            drawRelations();
          }
        });
      }, { threshold: 0.1 });

      $(document).ready(function () {
        $.each(relations, function (key) {
          const wrapper = document.querySelector(`[data-wrapper="${key}"]`);
          if (wrapper) {
            observer.observe(wrapper);
          }
        });
        drawRelations();
      });

      $(window).resize(function () {
        drawRelations();
      });
    }
  }

})(jQuery, Drupal, once, drupalSettings);
