<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_2_1.
 *
 * @IndicatorChart(
 *   id = "indicator_2_1",
 *   label = @Translation("Indicator 2.1."),
 *   description = @Translation("Performance of national hubs involving a broad network of stakeholders and engaged collaboration")
 * )
 */
class Indicator2Sub1 extends Indicator7Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'vertical_bar';
  }

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $data = parent::getChartData($table_data);
    $years = array_keys($data['chart']);
    $last_year = end($years);
    arsort($data['chart'][$last_year]);
    $order = array_keys($data['chart'][$last_year]);
    foreach ($data['chart'] as &$year_data) {
      $year_data = array_merge(array_flip($order), $year_data);
    }

    $data['label_x'] = NULL;
    $data['label_y'] = $this->t('Number of organisations');
    return $data;
  }

}
