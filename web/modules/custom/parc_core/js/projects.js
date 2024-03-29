(function ($, Drupal, once, drupalSettings) {

  Drupal.behaviors.parcProjects = {
    attach: function (context, settings) {
      var hoverEffect;
      var topic_counts = [];
      var keyword_counts = [];
      var project_keywords_counts = [];
      var project_topics_counts = [];

      var keywords = settings.parc_projects.keywords ?? {};
      var topics = settings.parc_projects.topics ?? {};
      var projects_list = settings.parc_projects.projects_list ?? {};

      var div_spacing = 10;

      function drawProjectsBlock() {
        topic_counts = [];
        keyword_counts = [];
        project_keywords_counts = [];
        project_topics_counts = [];

        let relations = settings.parc_projects.relations ?? {};

        $.each(relations, function (key, value) {
          let project = value.project;
          let term = value.term;
          let type = value.type
          drawCurve(project, term, type);
        });
      }

      function drawCurve(project, term, type) {
        let project_div = $('.projects-chart div[data-project="' + project + '"]');
        let term_div = $('.projects-chart div[data-' + type + '="' + term  + '"]');
        let path_element = $('.projects-chart path[data-project="' + project + '"][data-' + type + '="' + term + '"]');

        let startX;
        let startY;
        let endX;
        let endY;
        let spacing;
        let total;

        if (type == 'topic') {
          if (!topic_counts[term]) {
            topic_counts[term] = 1;
          }
          if (!project_topics_counts[project]) {
            project_topics_counts[project] = 1;
          }
          spacing = 30;
          endX = project_div.position().left - div_spacing;
          endY = project_div.position().top + project_div.outerHeight() / 2;
          total = projects_list[project].topics.length;
          endY -= ((total + 1) / 2 - project_topics_counts[project]) * spacing / 3;

          startX = term_div.position().left + div_spacing;
          startX += term_div.outerWidth();

          startY = term_div.position().top + term_div.outerHeight() / 2;
          total = topics[term].count;
          startY -= ((total + 1) / 2 - topic_counts[term]) * spacing

          topic_counts[term]++;
          project_topics_counts[project]++;
        }
        else {
          if (!project_keywords_counts[project]) {
            project_keywords_counts[project] = 1;
          }
          if (!keyword_counts[term]) {
            keyword_counts[term] = 1;
          }

          spacing = 3;
          startX = project_div.position().left + div_spacing;
          startX += project_div.outerWidth();

          startY = project_div.position().top + project_div.outerHeight() / 2;
          total = projects_list[project].keywords.length;
          startY -= ((total + 1) / 2 - project_keywords_counts[project]) * spacing;

          endX = term_div.position().left - div_spacing;
          endY = term_div.position().top + term_div.outerHeight() / 2;

          total = keywords[term].count;
          endY -= ((total + 1) / 2 - keyword_counts[term]) * spacing * 2;

          project_keywords_counts[project]++;
          keyword_counts[term]++;
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
        drawProjectsBlock();
      });

      $(window).resize(function() {
        drawProjectsBlock();
      });

      function focusProject(project_id, topic_id, keyword_id) {
        $('.projects-chart path[data-project="' + project_id + '"]').removeClass('unfocused');
        $('.projects-chart div[data-project="' + project_id + '"]').removeClass('unfocused');
        $.each(projects_list[project_id].topics, function (key, value) {
          $('.projects-chart div[data-topic="' + value + '"]').removeClass('unfocused');
        });
        $.each(projects_list[project_id].keywords, function (key, value) {
          $('.projects-chart div[data-keyword="' + value + '"]').removeClass('unfocused');
        });

        if (topic_id) {
          $('.projects-chart path[data-topic]:not([data-topic="' + topic_id +'"])').addClass('unfocused');
          $('.projects-chart .project-topic:not([data-topic="' + topic_id + '"])').addClass('unfocused');
        }
        if (keyword_id) {
          $('.projects-chart path[data-keyword]:not([data-keyword="' + keyword_id +'"])').addClass('unfocused');
          $('.projects-chart .project-keyword:not([data-keyword="' + keyword_id + '"])').addClass('unfocused');
        }
      }

      $(once('projectsHoverable', '.projects-chart .projects-hoverable, .projects-chart .projects-hoverable-path', context)).each(function () {
        $(this).on('mouseleave', function () {
          $('.projects-chart [data-project],.projects-chart [data-keyword],.projects-chart [data-topic]').removeClass('unfocused');
          window.clearTimeout(hoverEffect);
        }).on('mouseenter', function () {
          window.clearTimeout(hoverEffect);
          let that = $(this);

          hoverEffect = window.setTimeout(function () {
            $('.projects-chart [data-project],.projects-chart [data-keyword],.projects-chart [data-topic]').addClass('unfocused');
            let parent = that.hasClass('projects-hoverable-path') ? that : that.parent();
            let project_id = parent.attr('data-project')
            let keyword_id = parent.attr('data-keyword')
            let topic_id = parent.attr('data-topic')

            if (project_id) {
              focusProject(project_id, topic_id, keyword_id);
            }
            else if (keyword_id) {
              $('.projects-chart [data-keyword="' + keyword_id + '"]').removeClass('unfocused');
              $.each(keywords[keyword_id].projects, function(key, value) {
                focusProject(value, null, keyword_id);
              });
            }
            else if (topic_id) {
              $('.projects-chart [data-topic="' + topic_id + '"]').removeClass('unfocused');
              $.each(topics[topic_id].projects, function(key, value) {
                focusProject(value, topic_id, null);
              });
            }
          }, 100);
        });
      });
    }
  }

})(jQuery, Drupal, once, drupalSettings);
