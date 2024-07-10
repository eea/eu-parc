<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_9_2.
 *
 * @IndicatorChart(
 *   id = "indicator_9_2",
 *   label = @Translation("Indicator 9.2."),
 *   description = @Translation("Number and characteristics of entities in the risk assessment network catalogue (External)")
 * )
 */
class Indicator9Sub2 extends IndicatorChartPluginBase {

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
    $table_data = $this->transposeArray($table_data);
    foreach ($table_data as $row) {
      if (empty($header)) {
        $header = $row;
        array_shift($header);
        continue;
      }

      $year = array_shift($row);
      $data = array_combine($header, $row);
      $chart_data[$year] = $data;
    }

    return [
      'chart' => $chart_data,
      'label_x' => $this->t('Number of External Networks Catalogued'),
      'label_y' => NULL,
    ];
  }

  /**
   * Transpose array.
   *
   * @param array $data
   *   The array.
   *
   * @return array
   *   The transposed array.
   */
  protected function transposeArray(array $data) {
    return array_map(NULL, ...$data);
  }

}
