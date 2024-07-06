<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_1_2.
 *
 * @IndicatorChart(
 *   id = "indicator_1_2",
 *   label = @Translation("Indicator 1.2."),
 *   description = @Translation("Number and characteristics of PARC partners (by type of organisation)")
 * )
 */
class Indicator1Sub2 extends Indicator2Sub2 {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
