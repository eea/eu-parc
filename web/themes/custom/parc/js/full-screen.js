/**
 * Alter links to keep the full_screen query parameter.
 */
(function ($, Drupal, once) {
  Drupal.behaviors.fullScreenParameter = {
    attach: function (context, settings) {
      once('gtranslate-link', $('a'), context).forEach(function (el) {
        let href = $(el).attr('href');
        let domain = window.location.hostname;

        if (typeof href !== 'undefined' && href.indexOf('#') !== 0 && (href.indexOf('/') === 0 || href.includes(domain))) {
          var url = updateQueryStringParameter(href, 'full_screen', 1);
          $(el).attr('href', url);
        }
      });

      function updateQueryStringParameter(uri, key, value) {
        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";
        if (uri.match(re)) {
          return uri.replace(re, '$1' + key + "=" + value + '$2');
        }
        else {
          return uri + separator + key + "=" + value;
        }
      }
    }
  };
})(jQuery, Drupal, once);
