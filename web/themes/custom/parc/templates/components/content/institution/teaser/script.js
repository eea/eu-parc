/**
 * @file
 * Description.
*/

(function ($, Drupal) {
  Drupal.behaviors.institutionTeaser = {
    attach: function (context, settings) {
      $(document).once('expandInstitutionTeaser').on('click', '.node--institution .expand-link', function (e) {
        e.preventDefault();
        $(this).closest('.node--institution').find('.to-expand').toggleClass('hidden');
      })
    }
  };
})(jQuery, Drupal);
