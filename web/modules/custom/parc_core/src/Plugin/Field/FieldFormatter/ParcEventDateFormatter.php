<?php

namespace Drupal\parc_core\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\smart_date\Plugin\Field\FieldFormatter\SmartDateFormatterBase;

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

    $entries = [];
    foreach ($elements as $delta => $element) {
      $entry_timestamp = $element['#value'];

      $day = $element['start']['date']['value']['#markup'];
      [$start_hour, $start_minute] = explode(':', $element['start']['time']['value']['#markup']);
      $start_hour = (int) $start_hour;
      [$end_hour, $end_minute] = explode(':', $element['end']['time']['value']['#markup']);
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
      $entries[$day]['day_entries'][] = [
        'empty_top_height' => $empty_top_height,
        'fill_height' => $fill_height,
        'all_day' => $all_day,
        'time' => $element['start']['time']['value']['#markup'] . ' - ' . $element['end']['time']['value']['#markup'],
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
