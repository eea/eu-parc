<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_7_1.
 *
 * @IndicatorChart(
 *   id = "indicator_7_1",
 *   label = @Translation("Indicator 7.1."),
 *   description = @Translation("Number and characteristics of scientific publications (per month)")
 * )
 */
class Indicator7Sub1 extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
