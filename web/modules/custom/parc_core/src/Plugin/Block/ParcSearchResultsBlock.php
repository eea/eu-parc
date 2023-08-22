<?php

namespace Drupal\parc_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Http\RequestStack;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\parc_core\ParcSearchManager;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block to display the search results.
 *
 * @Block(
 *   id = "parc_search_results",
 *   admin_label = @Translation("Search results"),
 *   category = @Translation("PARC"),
 * )
 */
class ParcSearchResultsBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The current request.
   *
   * @var \Symfony\Component\HttpFoundation\Request
   */
  protected $request;

  /**
   * The Search Manager.
   *
   * @var \Drupal\parc_core\ParcSearchManager
   */
  protected $searchManager;

  /**
   * Creates a ParcSearchResultsBlock object.
   *
   * @param array $configuration
   *   The plugin configuration, i.e. an array with configuration values keyed
   *   by configuration option name. The special key 'context' may be used to
   *   initialize the defined contexts by setting it to an array of context
   *   values keyed by context names.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param mixed $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Routing\CurrentRouteMatch $route_match
   *   The current route match.
   * @param \Drupal\Core\Http\RequestStack $request_stack
   *   The request stack.
   * @param \Drupal\parc_core\ParcSearchManager $parc_search_manager
   *   The search manager.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, RouteMatchInterface $route_match, RequestStack $request_stack, ParcSearchManager $parc_search_manager) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);

    $this->entityTypeManager = $entity_type_manager;
    $this->routeMatch = $route_match;
    $this->request = $request_stack->getCurrentRequest();
    $this->searchManager = $parc_search_manager;
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
      $container->get('current_route_match'),
      $container->get('request_stack'),
      $container->get('parc_core.search_manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $current_node = $this->routeMatch->getRawParameter('node');
    $filter_bundle = $this->request->query->get('type');
    if ($filter_bundle) {
      $views[] = [
        '#type' => 'view',
        '#name' => 'search',
        '#display_id' => 'block_1',
        '#arguments' => [$filter_bundle, $current_node],
      ];

      return [
        'views' => $views,
        '#attributes' => [
          'class' => [
            'full-view',
          ],
        ]
      ];
    }


    $bundles = [
      'article',
      'events',
      'thematic_areas',
      'publications',
      'institution',
      'basic_page',
//      'deliverables',
    ];

    $views = [];
    foreach ($bundles as $bundle) {
      $views[] = [
        '#type' => 'view',
        '#name' => 'search',
        '#display_id' => 'block_1',
        '#arguments' => [$bundle, $current_node],
      ];
    }

    $views[] = [
      '#type' => 'view',
      '#name' => 'search',
      '#display_id' => 'block_1',
      '#arguments' => ['all', $current_node],
    ];

    return [
      'views' => $views,
      '#attributes' => [
        'class' => [
          $this->searchManager->isFullResultsPage() ? 'full-view' : 'teaser-view',
        ],
      ]
    ];
  }

}
