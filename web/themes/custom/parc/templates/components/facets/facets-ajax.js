(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.parcFacetsAjax = {
    attach: function (context, settings) {
      const facetsAjaxUrl = '/facets-block-ajax';
      window.facetsCollapseSettings = window.facetsCollapseSettings || {};

      // Store collapse information in a variable.
      $(document).ajaxSend(function(e, xhr, settings) {
        if (settings.url.startsWith(facetsAjaxUrl)) {
          $('.block-facets .collapse').each(function () {
            let id = $(this).attr('id');
            window.facetsCollapseSettings[id] = $(this).hasClass('show');
          });
        }
      });

      // On facets AJAX complete, apply previously stored collapse information.
      $(document).ajaxComplete(function(e, xhr, settings) {
        if (settings.url.startsWith(facetsAjaxUrl)) {
          $.each(window.facetsCollapseSettings, function (key, value) {
            let show = 'hide';
            if (value) {
              show = 'show';
            }
            $('#' + key).collapse(show);
          });
        }
      });

      $(document).ready(function(){
        var windowWidth = $(window).width();
        if (windowWidth <= 767) {
          $('#collapsecountry').collapse('hide');
          $('#collapsecategory').collapse('hide');
          $('#collapselab_type').collapse('hide');
          $('#collapselab_sampling_type').collapse('hide');
          $('#collapselab_substance_group').collapse('hide');
          $('#collapsefacet-blockcountry').collapse('hide');
          $('#collapsefacet-blockcategory').collapse('hide');
          $('#collapsefacet-blocklab-type').collapse('hide');
          $('#collapsefacet-blocklab-sampling-type').collapse('hide');
          $('#collapsefacet-blocklab-substance-group').collapse('hide');
          $('.learning-materials-page .block-facets .collapse').collapse('hide');
        }
      });

      $(once('facetCollapseExpand', '.facets-widget-parc_checkbox li.collapse')).on('shown.bs.collapse', function () {
        $(this).prev().addClass('facet-collapse-expanded');
      });

      $(once('facetCollapseCollapse', '.facets-widget-parc_checkbox li.collapse')).on('hidden.bs.collapse', function () {
        $(this).prev().removeClass('facet-collapse-expanded');
      });
    },
  };
})(jQuery, Drupal, drupalSettings);
