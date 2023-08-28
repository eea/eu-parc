(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.parcFacetsAjax = {
    attach: function (context, settings) {
      $(document).ready(function () {
        once('collapseFacets', 'body').forEach(() => {
          var windowWidth = $(window).width();
          if (windowWidth <= 767) {
            $('#collapsefacet-blocklab-type').collapse('hide');
            $('#collapsefacet-blocklab-sampling-type').collapse('hide');
            $('#collapsefacet-blocklab-substance-group').collapse('hide');
            $('#collapsefacet-blockcategory').collapse('hide');
            $('#collapsefacet-blockcountry').collapse('hide');
          }
        });
      });
    },
  };
})(jQuery, Drupal, drupalSettings);
