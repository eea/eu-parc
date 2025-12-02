(function ($, Drupal, once) {
    Drupal.behaviors.parcProjectsMobile = {
        attach: function (context, settings) {
            once('parcProjectsMobile', '.projects-mobile__project', context).forEach(function (element) {
                $(element).on('click', function () {
                    var $expanded = $(this).find('.projects-mobile__project__expanded');
                    var projectId = $expanded.data('project-id');

                    if ($expanded.find('.node').length === 0 && projectId) {
                        var ajaxSettings = {
                            url: '/parc/ajax/node-teaser/' + projectId,
                            base: $expanded.attr('id'),
                            element: $expanded[0],
                            progress: {
                                type: 'fullscreen',
                                message: Drupal.t('Loading...')
                            }
                        };
                        var myAjax = Drupal.ajax(ajaxSettings);
                        myAjax.execute();
                    }
                });
            });
        }
    };
})(jQuery, Drupal, once);
