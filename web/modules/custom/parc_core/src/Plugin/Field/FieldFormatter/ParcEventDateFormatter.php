<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\smart_date\Plugin\Field\FieldFormatter\SmartDateFormatterBase;
use Drupal\smart_date\SmartDateTrait;

/**
 * Plugin implementation of the 'parc_event_date' formatter.
 *
 * @FieldFormatter(
 *   id = "parc_event_date",
 *   label = @Translation("PARC Event Date"),
 *   field_types = {
 *     "smartdate"
 *   }
 * )
 */
class ParcEventDateFormatter extends SmartDateFormatterBase {

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode, $format = '') {
    $elements = parent::viewElements($items, $langcode);
    $parent = $items->getParent()->getEntity();

    if ($parent->hasField('field_hide_calendar')
      && !empty($parent->get('field_hide_calendar')->value)
      && !$items->isEmpty()) {
      $start_date = $items->get(0)->getValue()['value'];
      $end_date = $items->get($items->count() - 1)->getValue()['end_value'];

      $start_date = date('d.m.Y', $start_date);
      [$start_day, $start_month, $start_year] = explode('.', $start_date);
      $end_date = date('d.m.Y', $end_date);
      [$end_day, $end_month, $end_year] = explode('.', $end_date);
      if ($start_date == $end_date) {
        $markup = $start_date;
      }
      elseif ($start_year != $end_year) {
        $markup = "$start_date ─ $end_date";
      }
      elseif ($start_month != $end_month) {
        $markup = "$start_day.$start_month ─ $end_day.$end_month.$end_year";
      }
      else {
        $markup = "$start_day ─ $end_day.$end_month.$end_year";
      }

      return [
        '#type' => 'inline_template',
        '#template' => '
          <div class="field field--name-field-registration field--type-text-long field--label-above">
            <div class="f-label">{{ label }}</div>
            {{ value }}
          </div>',
        '#context' => [
          'label' => $this->t('Date'),
          'value' => $markup,
        ],
      ];
    }

    $entries = [];
    foreach ($elements as $delta => $element) {
      $entry_timestamp = $element['#value'];

      $day = $element['start']['date']['value']['#markup'];
      [$start_hour, $start_minute] = explode(':', $element['start']['time']['value']['#markup'] ?? '00:00');
      $start_hour = (int) $start_hour;
      [$end_hour, $end_minute] = explode(':', $element['end']['time']['value']['#markup'] ?? '00:00');
      $end_hour = (int) $end_hour;

      $start_timestamp = max($start_hour * 60 + $start_minute - 8 * 60, 0);
      $end_timestamp = max($end_hour * 60 + $end_minute - 8 * 60, 0);
      if ($end_timestamp > 12 * 60) {
        $end_timestamp = 12 * 60;
      }

      $empty_top_height = $start_timestamp * 100 / (60 * 12);
      $fill_height = ($end_timestamp - $start_timestamp) * 100 / (60 * 12);
      if ($fill_height < 10) {
        $fill_height = 10;
      }

      $all_day = FALSE;
      if (empty($element['end'])) {
        $all_day = TRUE;
        $fill_height = 100;
        $empty_top_height = 0;
      }

      $entries[$day]['timestamp'] = $entry_timestamp;
      $entries[$day]['day'] = $day;
      $time = !empty($element['start']['time']['value']['#markup'])
        ? $element['start']['time']['value']['#markup'] . ' - ' . $element['end']['time']['value']['#markup']
        : '';
      $entries[$day]['day_entries'][] = [
        'empty_top_height' => $empty_top_height,
        'fill_height' => $fill_height,
        'all_day' => $all_day,
        'time' => $time,
      ];
    }

    uasort($entries, function ($a, $b) {
      return $a['timestamp'] <=> $b['timestamp'];
    });

    return [
      '#theme' => 'parc_event_calendar',
      '#entries' => $entries,
    ];
  }

}
