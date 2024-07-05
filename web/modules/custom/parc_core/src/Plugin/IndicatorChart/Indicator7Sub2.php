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
class Indicator7Sub2 extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'horizontal_bar';
  }

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $header = NULL;
    $chart_data = [];
    foreach ($table_data as $row) {
      if (empty($header)) {
        $header = $row;
        array_shift($header);
        continue;
      }

      $category = array_shift($row);
      $data = array_combine($header, $row);
      $chart_data[] = [
        'data' => $data,
        'category' => $category,
      ];
    }

    return [
      'chart' => $chart_data,
      'label_x' => $this->t('Number of External Networks Catalogued'),
      'label_y' => NULL,
    ];
  }

}
