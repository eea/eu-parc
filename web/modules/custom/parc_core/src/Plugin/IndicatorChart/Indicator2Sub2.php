<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_2_2.
 *
 * @IndicatorChart(
 *   id = "indicator_2_2",
 *   label = @Translation("Indicator 2.2."),
 *   description = @Translation("Involvement of different stakeholders in the national hubs")
 * )
 */
class Indicator2Sub2 extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'radial';
  }

}
