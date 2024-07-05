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
class Indicator9Sub2 extends Indicator9Sub1 {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $data = parent::getChartData($table_data);
    $data['label_x'] = $this->t('Number of external networks catalogued');
    return $data;
  }

}
