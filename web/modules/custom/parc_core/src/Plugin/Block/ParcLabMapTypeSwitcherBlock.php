<?php

declare(strict_types=1);

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Path\CurrentPathStack;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\path_alias\AliasManagerInterface;
use Drupal\path_alias\Entity\PathAlias;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a parc lab map type switcher block.
 *
 * @Block(
 *   id = "parc_core_parc_lab_map_type_switcher",
 *   admin_label = @Translation("PARC Lab Map Type Switcher"),
 *   category = @Translation("Custom"),
 * )
 */
final class ParcLabMapTypeSwitcherBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * Constructs the plugin instance.
   */
  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly CurrentPathStack $currentPathStack,
    private readonly AliasManagerInterface $aliasManager, 
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): self {
    return new self(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_type.manager'),
      $container->get('path.current'),
      $container->get('path_alias.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $current_path = $this->currentPathStack->getPath();
    $current_path = $this->aliasManager->getAliasByPath($current_path);

    $storage = $this->entityTypeManager->getStorage('node');

    $query = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('type', 'laboratory')
      ->condition('status', 1);

    $nids = $query->execute();
    $nodes = $storage->loadMultiple($nids);

    $lab_categories = [];
    $active = NULL;
    foreach ($nodes as $node) {
      if ($node->hasField('field_lab_category') && !$node->get('field_lab_category')->isEmpty()) {
        $category_field = $node->get('field_lab_category');
        $category = $category_field->value;
        $label = $category_field->getSetting('allowed_values')[$category];        
        if (!isset($lab_categories[$category])) {
          $path = "/{$category}labnetwork";
          $lab_categories[$category] = [
            'label' => $label,
            'count' => 0,
            'path' => $path,
            'active' => $current_path === $path ? TRUE : FALSE,
          ];
        }
        $lab_categories[$category]['count']++;
        if ($current_path === $lab_categories[$category]['path']) {
          $active = [
            'label' => $label,
            'count' => $lab_categories[$category]['count'],
          ];
        }
      }
    }

    ksort($lab_categories);

    $build = [
      '#theme' => 'parc_lab_map_type_switcher',
      '#lab_categories' => $lab_categories,
      '#active' => $active,
    ];
    return $build;
  }

}
