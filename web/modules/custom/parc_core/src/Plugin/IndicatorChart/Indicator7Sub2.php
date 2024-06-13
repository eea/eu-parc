<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_7_2.
 *
 * @IndicatorChart(
 *   id = "indicator_7_2",
 *   label = @Translation("Indicator 7.2."),
 *   description = @Translation("Number and characteristics of scientific publications (per thematic area)")
 * )
 */
class Indicator7Sub2 extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
