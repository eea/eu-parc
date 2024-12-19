<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Plugin implementation of the synergies.
 *
 * @IndicatorChart(
 *   id = "synergies",
 *   label = @Translation("Synergies."),
 *   description = @Translation("Involvement of different stakeholders in the national hubs")
 * )
 */
class Synergies extends Indicator9Sub2 {

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'synergies';
  }
}
