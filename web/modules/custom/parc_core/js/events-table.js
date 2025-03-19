(function (Drupal, once) {

  Drupal.behaviors.parcEventsTable = {
    attach: function (context, settings) {
      let currentYear = document.querySelector('[data-current-year]').getAttribute('data-current-year');
      let selectedYear = currentYear;

      let arrow_left = document.querySelector('.arrow-left');
      let arrow_right = document.querySelector('.arrow-right');

      function cleanUpTableHeaders() {
        let row_move_up = document.querySelector('.row-move-up');
        if (row_move_up) {
          row_move_up.classList.remove('row-move-up');
        }

        let children = document.querySelector('.events-table').children;
        children = [...children].reverse();
        children.forEach(filler => {
          if (!filler.classList.contains('filler-row') && !filler.classList.contains('format-row')) {
            return;
          }
          let nextElement = filler.nextElementSibling;
          let shouldHide = true;
          while (nextElement) {
            if (nextElement.classList.contains('format-row')) {
              break;
            }
            if (nextElement.classList.contains('event-row') && !nextElement.classList.contains('hidden')) {
              shouldHide = false;
              break;
            }
            nextElement = nextElement.nextElementSibling;
          }
          if (shouldHide) {
            filler.classList.add('hidden');
          }
          else {
            filler.classList.remove('hidden');
          }
        });

        let month_row = document.querySelector('.events-table__month');
        let nextElement = month_row.nextElementSibling;
        let shouldHide = true;
        while (nextElement) {
          if (nextElement.classList.contains('format-row')) {
            break;
          }
          if (nextElement.classList.contains('event-row') && !nextElement.classList.contains('hidden')) {
            shouldHide = false;
            break;
          }
          nextElement = nextElement.nextElementSibling;
        }

        if (shouldHide) {
          month_row.querySelector('.events-table__row__format').classList.add('visibility-hidden');

          let first_visible_format = document.querySelector('.format-row:not(.hidden)');
          if (first_visible_format) {
            first_visible_format.classList.add('row-move-up');
          }
        }
        else {
          month_row.querySelector('.events-table__row__format').classList.remove('visibility-hidden');
        }
      }

      cleanUpTableHeaders();

      once('calendar-update', '.events-table__year__arrow').forEach(function (el) {
        el.addEventListener('click', () => {
          if (!el.classList.contains('disabled-arrow')) {
            if (el.classList.contains('arrow-left') && selectedYear > 2024) {
              selectedYear--;
            }
            else if (el.classList.contains('arrow-right') && selectedYear < currentYear) {
              selectedYear++;
            }
          }

          if (selectedYear == currentYear) {
            arrow_right.classList.add('disabled-arrow');
          }
          else {
            arrow_right.classList.remove('disabled-arrow');
          }

          if (selectedYear == 2024) {
            arrow_left.classList.add('disabled-arrow');
          }
          else {
            arrow_left.classList.remove('disabled-arrow');
          }

          document.querySelectorAll('[data-year]').forEach(item => {
            const itemYear = parseInt(item.getAttribute('data-year'), 10);
            const itemEndYear = item.hasAttribute('data-end-year')
              ? parseInt(item.getAttribute('data-end-year'), 10)
              : itemYear;
            if (itemYear > selectedYear + 1 || itemEndYear < selectedYear) {
              item.classList.add('hidden');
            }
            else {
              item.classList.remove('hidden');
            }
          });

          cleanUpTableHeaders();
        });
      });
    }
  }

})(Drupal, once);
