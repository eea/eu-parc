/**
 * @file
 * Description.
*/

(function ($, Drupal, once) {
  Drupal.behaviors.institutionTeaser = {
    attach: function (context, settings) {
      $(once('expandInstitutionTeaser', 'body')).on('click', '.node .expand-link', function (e) {
        e.preventDefault();
        $(this).toggleClass('expanded');
        if ($(this).hasClass('expanded')) {
          $(this).find('.expand-link-text').text(Drupal.t('Show less'));
        }
        else {
          $(this).find('.expand-link-text').text(Drupal.t('Details'));
        }
        $(this).closest('.node').find('.to-expand').toggleClass('hidden');
      })
    }
  };
})(jQuery, Drupal, once);
