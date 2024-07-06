<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_2_3.
 *
 * @IndicatorChart(
 *   id = "indicator_2_3",
 *   label = @Translation("Indicator 2.3."),
 *   description = @Translation("Expertise covered by the national hubs")
 * )
 */
class Indicator2Sub3 extends Indicator2Sub2 {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
