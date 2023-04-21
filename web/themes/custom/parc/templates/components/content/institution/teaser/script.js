/**
 * @file
 * Description.
*/

(function ($, Drupal) {
  Drupal.behaviors.institutionTeaser = {
    attach: function (context, settings) {
      $('.node--institution--teaser .expand-link').once('expandInstitutionTeaser').on('click', function (e) {
        e.preventDefault();
        $(this).closest('.node--institution').find('.to-expand').toggleClass('hidden');
      });
    }
  };
})(jQuery, Drupal);
