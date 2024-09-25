<?php

declare(strict_types=1);

namespace Drupal\parc_core;

use Drupal\Component\Plugin\PluginBase;
use Drupal\Core\StringTranslation\StringTranslationTrait;

/**
 * Base class for indicator_chart plugins.
 */
abstract class IndicatorChartPluginBase extends PluginBase implements IndicatorChartInterface {

  use StringTranslationTrait;

}
