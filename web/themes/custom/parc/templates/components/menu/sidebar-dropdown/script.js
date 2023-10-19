/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.menuSidebarDropdown = {
    attach: function (context, settings) {

      $(document).ready(function(){
        var windowWidth = $(window).width();
        if (windowWidth > 767) {
          $('.menu--sidebar-dropdown').last().find('.collapse').collapse('show');
        }
      });
    }
  };
})(jQuery, Drupal, once);
