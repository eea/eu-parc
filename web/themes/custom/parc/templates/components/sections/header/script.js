/**
 * @file
 * Description.
*/

let scrollpos = window.scrollY
const header = document.getElementById("header")

header.style.setProperty('--header-height', header.offsetHeight + 'px');

window.addEventListener('scroll', function() {
  scrollpos = window.scrollY;

  if (scrollpos >= 50) {
    header.classList.add(...["h-sticky", "shadow-sm"])
  } else {
    header.classList.remove(...["h-sticky", "shadow-sm"])
  }
});

(function ($, Drupal, once) {
  Drupal.behaviors.searchReveal = {
    attach: function (context, settings) {
      $(once('searchReveal', '.menu--top-menu .search-link')).click(function () {
        var search_block = $(this).closest('header').find('.block-views-exposed-filter-blocksearch-block-1');
        var input = search_block.find('input[type="text"]');
        if (search_block.is(':visible')) {
          search_block.hide();
        }
        else {
          search_block.show();
          search_block.find('input[type="text"]').focus();
          if ($(this).closest('#mainSidebar').hasClass('show')) {
            input.removeClass('ui-autocomplete-input');
            input.removeClass('form-autocomplete');
            input.attr('data-search-api-autocomplete-search', null);
            input.attr('data-autocomplete-path', null);
          }
        }
      });
    }
  };
})(jQuery, Drupal, once);
