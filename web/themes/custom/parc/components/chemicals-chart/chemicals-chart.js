/**
 * @file
 * Chemicals chart component logic.
 */

((Drupal, once) => {
    Drupal.behaviors.chemicalsChart = {
        attach(context) {
            const elements = once('chemicals-chart', '[data-chemical-target]', context);

            elements.forEach((el) => {
                const chemicalTarget = el.getAttribute('data-chemical-target');
                const targetElement = document.querySelector(`[data-chemical="${chemicalTarget}"]`);

                if (!targetElement) {
                    el.classList.add('disabled');
                }

                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (targetElement) {
                        const toggle = targetElement.querySelector('.js-chemical-accordion-toggle');
                        if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
                            toggle.click();
                        }
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        },
    };
})(Drupal, once);
