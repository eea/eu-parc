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
class Indicator9Sub1 extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
