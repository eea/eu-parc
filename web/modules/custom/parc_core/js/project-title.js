(function ($, Drupal, once, drupalSettings) {

  Drupal.behaviors.parcProjectTitle = {
    attach: function (context, settings) {
      var topic_count;
      var keyword_count;

      var keywords = settings.parc_project_title.keywords ?? {};
      var topics = settings.parc_project_title.topics ?? {};

      var div_spacing = 30;

      function drawProjectsTitle() {
        topic_count = 0;
        keyword_count = 0;

        $.each(topics, function (key, value) {
          drawCurve(value.id, 'topic');
        });

        $.each(keywords, function (key, value) {
          drawCurve(value.id, 'keyword');
        });
      }

      function drawCurve(term, type) {
        let project_div = $('.project-title--title--inner');
        let term_div = $('.project-title div[data-' + type + '="' + term  + '"]');
        let path_element = $('.project-title path[data-' + type + '="' + term + '"]');

        let startX;
        let startY;
        let endX;
        let endY;
        let spacing;
        let total;

        if (type == 'topic') {
          topic_count++;
          spacing = 40;
          endX = project_div.position().left - div_spacing;
          endY = project_div.position().top + project_div.outerHeight() / 2;
          total = topics.length;
          endY -= ((total + 1) / 2 - topic_count) * spacing / 3;

          startX = term_div.position().left + div_spacing;
          startX += term_div.outerWidth();

          startY = term_div.position().top + term_div.outerHeight() / 2;
        }
        else {
          keyword_count++;
          spacing = 6;
          startX = project_div.position().left + div_spacing;
          startX += project_div.outerWidth();

          startY = project_div.position().top + project_div.outerHeight() / 2;
          total = keywords.length;
          startY -= ((total + 1) / 2 - keyword_count) * spacing

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
        var EX = - Math.abs(endX - startX) * 0.01 + endX;
        var EY = endY;

        // L
        var FX = endX;
        var FY = endY;

        var path = 'M' + AX + ',' + AY;
        path += ' L' + BX + ',' + BY;
        path +=  ' ' + 'C' + CX + ',' + CY;
        path += ' ' + DX + ',' + DY;
        path += ' ' + EX + ',' + EY;
        path += ' L' + FX + ',' + FY;

        path_element.attr('d', path);
      }

      $(document).ready(function () {
        drawProjectsTitle();
      });

      $(window).resize(function() {
        drawProjectsTitle();
      });
    }
  }

})(jQuery, Drupal, once, drupalSettings);
