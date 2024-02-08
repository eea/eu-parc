<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\geolocation\MapCenterManager;
use Drupal\geolocation\MapProviderManager;
use Drupal\node\NodeInterface;
use Drupal\parc_core\ParcSearchManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Provides a block to display the parc project title.
 *
 * @Block(
 *   id = "parc_project_title",
 *   admin_label = @Translation("PARC Projects title"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcProjectTitleBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The current route match.
   *
   * @var \Drupal\Core\Routing\CurrentRouteMatch
   */
  protected $routeMatch;

  /**
   * Construct a ParcProjectBlock instance.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param string $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Routing\RouteMatchInterface
   *   The current route mtach.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, CurrentRouteMatch $route_match) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->entityTypeManager = $entity_type_manager;
    $this->routeMatch = $route_match;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_type.manager'),
      $container->get('current_route_match')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $project = $this->routeMatch->getParameter('node');

    if (!$project instanceof NodeInterface
      || $project->bundle() != 'project') {
      return [];
    }

    $topics = [];
    $keywords = [];

    foreach ($project->get('field_project_topics') as $item) {
      /** @var \Drupal\taxonomy\TermInterface $topic */
      $topic = $item->entity;
      $topics[] = [
        'name' => $topic->label(),
        'id' => $topic->id(),
        'color' => $topic->get('field_color')->color,
      ];
    }

    foreach ($project->get('field_project_keywords') as $item) {
      /** @var \Drupal\taxonomy\TermInterface $keyword */
      $keyword = $item->entity;
      $keywords[] = [
        'name' => $keyword->label(),
        'id' => $keyword->id(),
        'color' => $keyword->get('field_color')->color,
      ];
    }

    return [
      '#attached' => [
        'library' => [
          'parc_core/project_title',
        ],
        'drupalSettings' => [
          'parc_project_title' => [
            'topics' => $topics,
            'keywords' => $keywords,
          ],
        ],
      ],
      '#theme' => 'parc_project_title',
      '#topics' => $topics,
      '#keywords' => $keywords,
      '#title' => $project->getTitle(),
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags() {
    return Cache::mergeTags(parent::getCacheTags(), [
      'node_list:projects',
    ]);
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheContexts() {
    return Cache::mergeContexts(parent::getCacheContexts(), [
      'url',
    ]);
  }

}
