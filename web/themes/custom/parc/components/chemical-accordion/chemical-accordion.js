/**
 * @file
 * Chemical accordion component logic.
 */

((Drupal, once) => {
  Drupal.behaviors.chemicalAccordion = {
    attach(context) {
      const accordions = Array.from(context.querySelectorAll('.chemical-accordion'));
      const onceAccordions = once('chemical-accordion', '.chemical-accordion', context);

      const closeOtherAccordions = (currentAccordion) => {
        accordions.forEach((acc) => {
          if (acc !== currentAccordion && acc.classList.contains('is-expanded')) {
            const toggle = acc.querySelector('.js-chemical-accordion-toggle');
            const content = acc.querySelector('.js-chemical-accordion-content');
            toggle.setAttribute('aria-expanded', 'false');
            acc.classList.remove('is-expanded');
            content.style.display = 'none';
          }
        });
      };

      const updateUrlParameter = (id) => {
        const url = new URL(window.location.href);
        if (id) {
          url.searchParams.set('chemical', id);
        } else {
          url.searchParams.delete('chemical');
        }
        window.history.replaceState({}, '', url.toString());
      };

      onceAccordions.forEach((accordion) => {
        const toggle = accordion.querySelector('.js-chemical-accordion-toggle');
        const content = accordion.querySelector('.js-chemical-accordion-content');
        const chemicalId = accordion.dataset.chemical;

        toggle.addEventListener('click', () => {
          const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

          if (!isExpanded) {
            closeOtherAccordions(accordion);
            updateUrlParameter(chemicalId);
          } else {
            updateUrlParameter(null);
          }

          toggle.setAttribute('aria-expanded', !isExpanded);
          accordion.classList.toggle('is-expanded', !isExpanded);
          content.style.display = isExpanded ? 'none' : 'block';
        });

        // Simple tab switching logic if Bootstrap JS is not present
        const tabs = accordion.querySelectorAll('[data-bs-toggle="tab"]');
        tabs.forEach((tab) => {
          tab.addEventListener('click', (e) => {
            const targetId = tab.getAttribute('data-bs-target');
            const targetPane = accordion.querySelector(targetId);

            // Remove active from all tabs in this accordion
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Hide all panes in this accordion
            accordion.querySelectorAll('.tab-pane').forEach(p => {
              p.classList.remove('show', 'active');
            });

            // Ensure accordion is expanded when picking a tab
            if (toggle.getAttribute('aria-expanded') !== 'true') {
              toggle.click();
            }

            // Show target pane
            targetPane.classList.add('show', 'active');

            e.preventDefault();
            e.stopPropagation();
          });
        });
      });

      // Handle URL parameter on page load
      const urlParams = new URLSearchParams(window.location.search);
      const activeChemical = urlParams.get('chemical');
      if (activeChemical) {
        const targetAccordion = document.querySelector(`.chemical-accordion[data-chemical="${activeChemical}"]`);
        if (targetAccordion) {
          // We need to wait a bit for potential lazy loading or other scripts
          setTimeout(() => {
            const topOffset = targetAccordion.getBoundingClientRect().top + window.pageYOffset - 70;
            window.scrollTo({
              top: topOffset,
              behavior: 'smooth'
            });
            const toggle = targetAccordion.querySelector('.js-chemical-accordion-toggle');
            if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
              toggle.click();
            }
          }, 500);
        }
      }
    },
  };
})(Drupal, once);
