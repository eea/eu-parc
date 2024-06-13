<?php

declare(strict_types=1);

namespace Drupal\parc_core\Annotation;

use Drupal\Component\Annotation\Plugin;

/**
 * Defines indicator_chart annotation object.
 *
 * @Annotation
 */
final class IndicatorChart extends Plugin {

  /**
   * The plugin ID.
   */
  public string $id;

  /**
   * The human-readable name of the plugin.
   *
   * @ingroup plugin_translatable
   */
  public string $title;

  /**
   * The description of the plugin.
   *
   * @ingroup plugin_translatable
   */
  public string $description;

}
