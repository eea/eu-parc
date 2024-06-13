<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the indicator_2_1.
 *
 * @IndicatorChart(
 *   id = "indicator_2_1",
 *   label = @Translation("Indicator 2.1."),
 *   description = @Translation("Performance of national hubs involving a broad network of stakeholders and engaged collaboration")
 * )
 */
class Indicator2Sub1 extends IndicatorChartPluginBase {

  /**
   * {@inheritdoc}
   */
  public function render(array $rows): array {
    return [];
  }

}
