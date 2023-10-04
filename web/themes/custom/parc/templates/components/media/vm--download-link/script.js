/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.mediaLink = {
    attach: function (context) {
      $(once('mediaLink', '.btn--d--clipboard', context)).on('click', function (e) {
        e.preventDefault();
        var btn = $(this);
        var copyText = window.location.origin + btn.data('clipboard');

        btn.addClass('added');
        setTimeout(function () {
          btn.removeClass('added');
        }, 1000);

        document.addEventListener('copy', function(e) {
           e.clipboardData.setData('text/plain', copyText);
           e.preventDefault();
        }, true);
        document.execCommand("copy");
      });
    }
  }
})(jQuery, Drupal, once);
