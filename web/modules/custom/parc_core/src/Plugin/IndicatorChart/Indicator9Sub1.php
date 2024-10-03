<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_9_1.
 *
 * @IndicatorChart(
 *   id = "indicator_9_1",
 *   label = @Translation("Indicator 9.1."),
 *   description = @Translation("Number and characteristics of entities in the risk assessment network catalogue (PARC)")
 * )
 */
class Indicator9Sub1 extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartData(array $table_data): array {
    $data = parent::getChartData($table_data);
    $data['label_x'] = $this->t('Number of entities');
    $data['label_y'] = NULL;
    return $data;
  }

}
