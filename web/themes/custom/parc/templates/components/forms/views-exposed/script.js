/**
 * @file
 * Description.
*/

(function ($, Drupal, once) {
  Drupal.behaviors.viewsExposedForm = {
    attach: function (context, settings) {
      var btn = $("#js-order-btn", context);

      if (window.location.href.indexOf("created_DESC") > -1) {
        btn.addClass("arrow-up");
      }

      $('.bef-checkboxes input:checked').once('viewsExposedForm').each(function() {
        var label = $(this)['0'].labels['0'].innerHTML;
        var labelClass = label.toLowerCase().replace(" ", "-");
        var itemId = $(this).attr('id');
        var color = $(this).parent().data('color');
        var insert = '<label for="' + itemId + '" class="option bg--' + labelClass + '" style="background-color: ' + color + '">' + label + '</label>'
        $("#js-selected-categories").append(insert);
      });

      btn.once('viewsExposedForm').click(function() {
        var radioBox = $('input[name="sort_bef_combine"]:not(:checked)', context);
        radioBox.trigger( "click" );
      });
    }
  };
})(jQuery, Drupal, once);