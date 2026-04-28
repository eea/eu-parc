<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_7_2.
 *
 * @IndicatorChart(
 *   id = "indicator_7_2",
 *   label = @Translation("Indicator 7.2."),
 *   description = @Translation("Number and characteristics of scientific publications (per thematic area)")
 * )
 */
class Indicator7Sub2 extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'group_pie';
  }

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $data = parent::getChartData($table_data);

    $flattened = [];

    foreach ($data['chart'] as $year => $year_data) {
      foreach ($year_data as $category => $value) {

        if (!isset($flattened[$category])) {
          $flattened[$category] = [
            'ongoing' => 0,
            'achieved' => 0,
          ];
        }

        if (is_string($value) && str_contains($value, '/')) {
          [$ongoing, $achieved] = explode('/', $value, 2);

          $flattened[$category]['ongoing'] += (int) trim($ongoing);
          $flattened[$category]['achieved'] += (int) trim($achieved);
        }
        elseif (is_array($value)) {
          $flattened[$category]['ongoing'] += (int) ($value['ongoing'] ?? 0);
          $flattened[$category]['achieved'] += (int) ($value['achieved'] ?? 0);
        }
        else {
          $flattened[$category]['ongoing'] += (int) $value;
        }
      }
    }

    $data['chart'] = $flattened;

    return $data;
  }

}
