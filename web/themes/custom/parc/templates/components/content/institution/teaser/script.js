/**
 * @file
 * Description.
*/

(function ($, Drupal) {
  Drupal.behaviors.institutionTeaser = {
    attach: function (context, settings) {
      $(document).once('expandInstitutionTeaser').on('click', '.node--institution .expand-link', function (e) {
        e.preventDefault();
        $(this).toggleClass('expanded');
        if ($(this).hasClass('expanded')) {
          $(this).find('.expand-link-text').text(Drupal.t('Show less'));
        }
        else {
          $(this).find('.expand-link-text').text(Drupal.t('Details'));
        }
        $(this).closest('.node--institution').find('.to-expand').toggleClass('hidden');
      })
    }
  };
})(jQuery, Drupal);
