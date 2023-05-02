/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.viewsExposedForm = {
    attach: function (context, settings) {
      $(context).find("details[data-drupal-selector='edit-category-collapsible'] .bef-checkboxes input").each(function () {
        var label = $(this)['0'].labels['0'].innerHTML;
        var labelClass = label.toLowerCase().replace(" ", "-");
        var itemId = $(this).attr('id');
        var color = $(this).parent().data('color');
        if ($(this).is(':checked')) {
          if ($(context).find("#js-selected-category label[class*='bg--" + labelClass + "']").length === 0) {
            var insert = '<label for="' + itemId + '" class="option bg--' + labelClass + '" style="--ci-bg: ' + color + '">' + label + '</label>'
            $("#js-selected-category").append(insert);
          }
        } else {
          $(context).find("#js-selected-category label[class*='bg--" + labelClass + "']").remove();
        }
      });

      $(context).find('label.option').once('viewsExposedForm').on('click', function () {
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
})(jQuery, Drupal, once);
