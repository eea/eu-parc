/**
 * @file
 * Description.
*/

let scrollpos = window.scrollY
let lastScrollTop = scrollpos
const header = document.getElementById("header")
const navbar = header.querySelector(".navbar")
const stickyTitle = header.querySelector(".header-sticky-title")
let pageTitleEl = document.querySelector("main .svg-title")
const titleSwapOffset = navbar ? navbar.offsetHeight : header.offsetHeight

function updateHeaderOffsets() {
  const navbarHeight = navbar ? navbar.offsetHeight : header.offsetHeight
  const titleVisible = stickyTitle && header.classList.contains("title-passed") && stickyTitle.offsetParent !== null
  const visible = (header.classList.contains("vh") ? 0 : navbarHeight) + (titleVisible ? stickyTitle.scrollHeight : 0)

  header.style.setProperty('--navbar-height', navbarHeight + 'px')
  document.documentElement.style.setProperty('--header-visible-height', visible + 'px')
}

let headerHeight = header.offsetHeight
header.style.setProperty('--header-height', headerHeight + 'px');

window.addEventListener('resize', function() {
  if (!header.classList.contains("h-sticky")) {
    headerHeight = header.offsetHeight
  }
  updateHeaderOffsets()
});

window.addEventListener('scroll', function() {
  scrollpos = window.scrollY;

  document.documentElement.style.overflowAnchor = scrollpos < 300 ? 'none' : ''

  const isSticky = header.classList.contains("h-sticky")
  if (scrollpos >= 50 !== isSticky) {
    if (isSticky) {
      header.classList.remove(...["h-sticky", "shadow-sm"])
      header.style.marginBottom = ''
    } else {
      header.classList.add(...["h-sticky", "shadow-sm"])
      header.style.marginBottom = Math.max(0, headerHeight - header.offsetHeight) + 'px'
    }
  }

  if (pageTitleEl && !pageTitleEl.isConnected) {
    pageTitleEl = document.querySelector("main .svg-title")
  }

  if (pageTitleEl) {
    if (pageTitleEl.getBoundingClientRect().bottom <= titleSwapOffset) {
      header.classList.add("title-passed")
    } else {
      header.classList.remove("title-passed")
    }
  }

  const menuOpen = document.body.classList.contains("overlay-is-navbar-collapse")
  if (scrollpos > lastScrollTop && scrollpos > 120 && !menuOpen) {
    header.classList.add("vh")
  } else if (scrollpos < lastScrollTop || scrollpos <= 120) {
    header.classList.remove("vh")
  }
  lastScrollTop = Math.max(0, scrollpos)

  updateHeaderOffsets()
});

updateHeaderOffsets()

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
