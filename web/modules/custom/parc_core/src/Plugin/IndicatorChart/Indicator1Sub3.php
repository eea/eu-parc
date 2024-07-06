<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_1_3.
 *
 * @IndicatorChart(
 *   id = "indicator_1_3",
 *   label = @Translation("Indicator 1.3."),
 *   description = @Translation("Number and characteristics of PARC partners (by research focus)")
 * )
 */
class Indicator1Sub3 extends Indicator1Sub2 {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
