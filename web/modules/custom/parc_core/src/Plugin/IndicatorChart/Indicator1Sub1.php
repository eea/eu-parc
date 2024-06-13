<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_1_1.
 *
 * @IndicatorChart(
 *   id = "indicator_1_1",
 *   label = @Translation("Indicator 1.1."),
 *   description = @Translation("Number and characteristics of PARC partners (by country)")
 * )
 */
class Indicator1Sub1 extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
