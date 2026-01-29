/**
 * @file
 * FAQ component logic.
 */

((Drupal, once) => {
    Drupal.behaviors.faqAccordion = {
        attach(context) {
            const faqs = once('faq-accordion', '.js-faq-accordion', context);

            faqs.forEach((faq) => {
                const toggle = faq.querySelector('.js-faq-toggle');
                const content = faq.querySelector('.js-faq-content');

                toggle.addEventListener('click', () => {
                    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

                    toggle.setAttribute('aria-expanded', !isExpanded);
                    faq.classList.toggle('is-expanded', !isExpanded);

                    if (isExpanded) {
                        content.style.display = 'none';
                    } else {
                        content.style.display = 'block';
                    }
                });
            });
        },
    };
})(Drupal, once);
