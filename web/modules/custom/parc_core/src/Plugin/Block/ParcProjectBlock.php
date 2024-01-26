<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\parc_core\ParcSearchManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Provides a block to display the search results.
 *
 * @Block(
 *   id = "parc_projects",
 *   admin_label = @Translation("PARC Projects"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcProjectBlock extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    return [
      '#attached' => [
        'library' => [
          'parc_core/projects',
        ],
      ],
      '#theme' => 'parc_projects',
    ];
  }

}
