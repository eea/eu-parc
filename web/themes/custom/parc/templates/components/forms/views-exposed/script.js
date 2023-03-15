/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.viewsExposedForm = {
    attach: function (context, settings) {
      var btn = $("#js-order-btn", context);
      if (window.location.href.indexOf("_DESC") > -1) {
        btn.addClass("arrow-up");
      } else {
        btn.removeClass("arrow-up");
      }

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
      $(context).find("#js-selected-category label").each(function () {
        $(this).on('click', function () {
          let idAttr = $(this).attr('for');
          $(context).find("details[data-drupal-selector='edit-category-collapsible'] .bef-checkboxes input#" + idAttr).prop("checked", false).trigger("change");
          $(this).remove();
        });
      });

      $(context).find('#js-order-btn').on('click', function () {
        var fieldSet = $('fieldset[data-drupal-selector="edit-sort-bef-combine"]', context);

        fieldSet.each(function () {
          if (window.location.href.indexOf("_DESC") > -1) {
            var inputUncheck = $(this).find("input[value='created_ASC']");
          } else {
            var inputUncheck = $(this).find("input[value='created_DESC']");
          }

          inputUncheck.prop("checked", true).trigger("change");
        });
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
