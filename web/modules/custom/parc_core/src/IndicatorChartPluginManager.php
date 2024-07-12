<?php

declare(strict_types=1);

namespace Drupal\parc_core;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;
use Drupal\parc_core\Annotation\IndicatorChart;

/**
 * IndicatorChart plugin manager.
 */
final class IndicatorChartPluginManager extends DefaultPluginManager {

  /**
   * Constructs the object.
   */
  public function __construct(\Traversable $namespaces, CacheBackendInterface $cache_backend, ModuleHandlerInterface $module_handler) {
    parent::__construct('Plugin/IndicatorChart', $namespaces, $module_handler, IndicatorChartInterface::class, IndicatorChart::class);
    $this->alterInfo('indicator_chart_info');
    $this->setCacheBackend($cache_backend, 'indicator_chart_plugins');
  }

}
