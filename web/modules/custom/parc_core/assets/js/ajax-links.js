(function ($, Drupal, drupalSettings) {

  Drupal.behaviors.ajaxLink = {
    attach: function (context, settings) {

      // Deal with auto ajax link load.
      let ajaxLinkAutoLinks = {
        // All links defined as auto ajax link.
        links: [],
        // Enabled links are the links which can still be used by ajax links.
        enabledLinks: [],
        addLink: function (element) {
          this.links.push(element);
          this.enabledLinks.push(element);
        },
        // Link has been used and has to be disabled. Remove it from enabled
        // list.
        disableLink: function (element) {
          for (let i = 0; i < this.enabledLinks.length; i++) {
            if (this.enabledLinks[i] === element) {
              this.enabledLinks.splice(i, 1);
            }
          }
        },
        // Init the scroll listener to check if enabled elements are displayed
        // and ajax link as to be launched.
        init: function () {
          let self = this;
          $(window).scroll(function () {
            self.executeAll();
          });
        },
        // Check each enabled link to try executing ajax.
        executeAll: function () {
          let self = this;
          // Only enabled links will work, and link can be used only onced.
          self.enabledLinks.forEach(function (element) {
            self.execute(element);
          });
        },
        // Execute ajax link if link is in the displayed browser area.
        execute: function (element) {
          // We check if link is in the displayed area.
          var viewportOffset = element.getBoundingClientRect();
          var ajaxLinkLinkTop = viewportOffset.top;
          if (ajaxLinkLinkTop >= 0 && $(window).height() > ajaxLinkLinkTop) {
            this.disableLink(element);

            // Init click event.
            let e = document.createEvent('Events');
            e.initEvent('click', true, false);
            element.dispatchEvent(e);
          }
        }
      };

      // Deal with ajax link action.
      let ajaxLink = {
        execute: function (element, e = {}) {
          let $element = $(element);

          // Prevent an ajax link to be executed twice.
          if ($element.data('ajax-link-executed')) {
            return false;
          }

          // Selector will be used to know where to make method replacement.
          let selector = $element.data('ajax-link-selector');
          // Fallback if no selector is defined, add one on the parent.
          if (selector === '' || selector === undefined) {
            $element.parent().addClass('ajax-link-wrapper');
            selector = '.ajax-link-wrapper';
          }

          let $selectedWrapper = $(selector);

          // Only following methods are available :
          // - replace : will use ReplaceCommand.
          // - append : will use AppendCommand.
          // If another method is used, nothing will append.
          let method = $element.data('ajax-link-method');
          // Fallback if no method is defined, use replace as default.
          if (method === '' || method === undefined) {
            method = 'replace';
          }

          // Define if history browser functionnality has to be used, that will
          // be reflected in the browser url.
          let history = $element.data('ajax-link-history');
          // Fallback if no history is defined, use 0 as default (no history).
          if (history === '' || history === undefined) {
            history = 0;
          }
          // Check for node id.
          let nid = $element.attr('nid');
          // Prepare the ajax call.
          let href = $element.attr('href');
          let encodedHref = encodeURI($element.attr('href'));
          let url = drupalSettings.path.baseUrl + 'parc/ajax_link?path=' + encodedHref + '&selector=' + selector + '&method=' + method + '&nid=' + nid;
          let settings = {
            progress: {
              type: 'none'
            },
            url: url,
            element: $element.get(0)
          };

          const regex = /https?:\/\/[^\/]+/i;
          let path = href.replace(regex, '');
          let ajax = new Drupal.ajax(settings);

          // Collect original success method to be able to override and call it
          // later.
          let parentSuccess = ajax.options.success;
          ajax.options.success = function (response, status, xmlHttpRequest) {
            if (history === 1) {
              window.history.pushState(response, "", path);
            }
            // Call original success method.
            parentSuccess(response, status, xmlHttpRequest);

            // Reload behaviors for the new content.
            $selectedWrapper.each(function (context) {
              Drupal.attachBehaviors(context, Drupal.settings);
            });
            $element.parents('ul').find('a.active').removeClass('active');
            $element.addClass('active');
          }

          // Register the call ajax event.
          ajax.eventResponse(ajax, e);
        }
      }

      // Execute the ajax link on click and prevent access to this link.
      $(context).find('a.ajax-link').once('ajax').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        ajaxLink.execute(this, e);

        return false;
      });

      // Initialise auto ajax links based on their class.
      $(context).find('a.ajax-link-auto').once('ajaxLinkAuto').each(function () {
        // The current link.
        let $ajaxLinkLink = $(this);
        let ajaxLinkLink = $ajaxLinkLink.get(0);

        // Add the current link to the auto links.
        ajaxLinkAutoLinks.addLink(ajaxLinkLink);
        if (ajaxLinkAutoLinks.links.length === 1) {
          // Init when the first element is added to add scroll listener.
          ajaxLinkAutoLinks.init();
        }
        // In any cases, don't wait to scroll the first time.
        ajaxLinkAutoLinks.execute(ajaxLinkLink);
      });
    }
  };

})(jQuery, Drupal, drupalSettings);
