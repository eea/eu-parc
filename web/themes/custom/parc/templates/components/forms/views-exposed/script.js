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
      }

      $('#edit-category-collapsible .bef-checkboxes input:checked').once('viewsExposedForm').each(function() {
        var label = $(this)['0'].labels['0'].innerHTML;
        var labelClass = label.toLowerCase().replace(" ", "-");
        var itemId = $(this).attr('id');
        var color = $(this).parent().data('color');
        var insert = '<label for="' + itemId + '" class="option bg--' + labelClass + '" style="--ci-bg: ' + color + '">' + label + '</label>'
        $("#js-selected-categories").append(insert);
      });

      $('body').once('viewsExposedForm').on('click', '#js-order-btn', function() {
        var fieldSet = $('fieldset[data-drupal-selector="edit-sort-bef-combine"]', context)

        fieldSet.each(function () {
          let inputUncheck = $(this).find('input:not(:checked)');
          inputUncheck.trigger( "click" );
        });
      });
    }
  };

  Drupal.behaviors.detailsMouse = {
    attach: function (context) {
      $('details', context).on('mouseleave', function(e) {
        e.currentTarget.open=false;
      });
    }
  };
})(jQuery, Drupal, once);
