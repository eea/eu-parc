<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\IndicatorChart;

use Drupal\parc_core\IndicatorChartPluginBase;

/**
 * Base class for Aligned Studies image-based indicator plugins.
 */
abstract class AlignedStudiesBase extends IndicatorChartPluginBase {

  const CHARTS_PATH = '/modules/custom/parc_core/data/charts/';

  /**
   * {@inheritdoc}
   */
  public function getChartType(): string {
    return 'images';
  }

}
