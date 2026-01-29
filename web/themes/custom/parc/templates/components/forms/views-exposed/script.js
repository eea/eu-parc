/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.viewsExposedForm = {
    attach: function (context, settings) {
      let svg = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1_2)"><path d="M6 0C2.69147 0 0 2.69147 0 6C0 9.30853 2.69147 12 6 12C9.30853 12 12 9.30853 12 6C12 2.69147 9.30853 0 6 0ZM8.20952 7.50246C8.40499 7.69802 8.40499 8.01398 8.20952 8.20952C8.16314 8.25602 8.10803 8.2929 8.04735 8.31804C7.98667 8.34318 7.92162 8.35608 7.85595 8.35601C7.72798 8.35601 7.59998 8.30702 7.50246 8.20952L6 6.70697L4.49754 8.20955C4.45116 8.25604 4.39606 8.29291 4.3354 8.31805C4.27473 8.34319 4.2097 8.3561 4.14403 8.35603C4.07836 8.3561 4.01331 8.3432 3.95264 8.31806C3.89197 8.29292 3.83686 8.25604 3.79048 8.20955C3.59501 8.01398 3.59501 7.69802 3.79048 7.50246L5.29303 6L3.79045 4.49754C3.59498 4.30198 3.59498 3.98602 3.79045 3.79048C3.98602 3.59501 4.30198 3.59501 4.49754 3.79048L6 5.29303L7.50246 3.79045C7.69802 3.59498 8.01398 3.59498 8.20952 3.79045C8.40499 3.98602 8.40499 4.30198 8.20952 4.49754L6.70697 6L8.20952 7.50246Z" fill="white"/></g><defs><clipPath id="clip0_1_2"><rect width="12" height="12" fill="white"/></clipPath></defs></svg>';

      $(context).find("details[data-drupal-selector='edit-category-collapsible'] .bef-checkboxes input" +
        ",details[data-drupal-selector='edit-deliverable-type-collapsible'] .bef-checkboxes input" +
        ",details[data-drupal-selector='edit-topics-collapsible'] .bef-checkboxes input" +
        ",details[data-drupal-selector='edit-keywords-collapsible'] .bef-checkboxes input" +
        ",details[data-drupal-selector='edit-chemicals-collapsible'] .bef-checkboxes input" +
        ",details[data-drupal-selector='edit-training-topic-collapsible'] .bef-checkboxes input").each(function () {
        var label = $(this)['0'].labels['0'].innerHTML;
        var labelClass = label.toLowerCase().replace(" ", "-").replace('&amp; ', '-');
        var itemId = $(this).attr('id');
        var color = $(this).parent().data('color');
        if ($(this).is(':checked')) {
          let form = $(this).closest('form');
          if ($(context).find("#js-selected-category label[class*='bg--" + labelClass + "']").length === 0
            && !form.hasClass('d-none')) {
            var insert = '<label for="' + itemId + '" class="option bg--' + labelClass + '" style="--ci-bg: ' + color + '">' + label + svg + '</label>'
            $("#js-selected-category").append(insert);
          }
        } else {
          $(context).find("#js-selected-category label[class*='bg--" + labelClass + "']").remove();
        }
      });

      $(once('viewsExposedForm', 'label.option', context)).on('click', function () {
        const input = $('.js-second-exposed-filter input[type="radio"]:not(:checked)');
        input.trigger("change");
      });
    }
  };

  Drupal.behaviors.detailsMouse = {
    attach: function (context) {
      $('details', context).on('mouseleave', function (e) {
        e.currentTarget.open = false;
      });
    }
  };


  Drupal.behaviors.parcViewsFilterDetailsAjax = {
    attach: function (context, settings) {
      const views_ajax_url = '/views/ajax';

      window.viewsFilterCollapseSettings = window.viewsFilterCollapseSettings || {};

      // Store views filter collapse information in a variable.
      $(document).ajaxSend(function(e, xhr, settings) {
        if (settings.url.startsWith(views_ajax_url)) {
          $('form.bef-exposed-form details').each(function () {
            let id = $(this).attr('id');
            window.viewsFilterCollapseSettings[id] = $(this).attr('open');
          });
        }
      });

      // On views filter AJAX complete, apply previously stored collapse information.
      $(document).ajaxComplete(function(e, xhr, settings) {
        if (settings.url.startsWith(views_ajax_url)) {
          $.each(window.viewsFilterCollapseSettings, function (key, value) {
            let id = key.split('--')[0];
            let element = $('form.bef-exposed-form details[id^="' + id + '"]');

            if (value === 'open') {
              element.attr('open', 'open');
            }

            setTimeout(function () {
              if (!element.is(':hover')) {
                element.removeAttr('open');
              }
            }, 0)
          });

          window.viewsFilterCollapseSettings = {};
        }
      });
    },
  };
})(jQuery, Drupal, once);
