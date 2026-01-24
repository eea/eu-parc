/**
 * @file
 * Chemical accordion component logic.
 */

((Drupal, once) => {
  Drupal.behaviors.chemicalAccordion = {
    attach(context) {
      const accordions = once('chemical-accordion', '.chemical-accordion', context);

      accordions.forEach((accordion) => {
        const toggle = accordion.querySelector('.js-chemical-accordion-toggle');
        const content = accordion.querySelector('.js-chemical-accordion-content');

        toggle.addEventListener('click', () => {
          const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

          toggle.setAttribute('aria-expanded', !isExpanded);
          accordion.classList.toggle('is-expanded', !isExpanded);

          if (isExpanded) {
            content.style.display = 'none';
          } else {
            content.style.display = 'block';
          }
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
    },
  };
})(Drupal, once);
