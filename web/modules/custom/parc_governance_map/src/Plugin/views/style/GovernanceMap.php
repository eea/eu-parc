<?php

namespace Drupal\parc_governance_map\Plugin\views\style;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\node\NodeInterface;
use Drupal\taxonomy\TermInterface;
use Drupal\views\Plugin\views\style\StylePluginBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Style plugin to render each item on a map.
 *
 * @ingroup views_style_plugins
 *
 * @ViewsStyle(
 *   id = "governance_map",
 *   title = @Translation("Governance map"),
 *   help = @Translation("Display results as a map"),
 *   theme = "views_view_governance_map",
 *   display_types = {"normal"}
 * )
 */
class GovernanceMap extends StylePluginBase {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The node view builder.
   *
   * @var \Drupal\node\NodeViewBuilder $nodeViewBuilder
   */
  protected $nodeViewBuilder;

  /**
   * The renderer service.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * Constructs a GovernanceMap object.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param mixed $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer service.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, RendererInterface $renderer) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);

    $this->entityTypeManager = $entity_type_manager;
    $this->nodeViewBuilder = $entity_type_manager->getViewBuilder('node');
    $this->renderer = $renderer;
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
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function usesFields() {
    return FALSE;
  }

  /**
   * {@inheritdoc}
   */
  public function render() {
    $institutions = [];

    $map_id = uniqid();

    foreach ($this->view->result as $item) {
      $institution = $item->_entity;

      if (!$institution instanceof NodeInterface) {
        continue;
      }

      $teaser_render = $this->nodeViewBuilder->view($institution, 'teaser');
      $teaser_render = $this->renderer->render($teaser_render);

      $full_render = $this->nodeViewBuilder->view($institution);
      $full_render = $this->renderer->render($full_render);

      $country_iso2 = NULL;
      $country = $institution->get('field_country')->entity;
      if ($country instanceof TermInterface) {
        $country_iso2 = $country->get('field_iso2')->value;
      }

      $institutions[] = [
        'id' => $institution->id(),
        'lat' => (float) $institution->get('field_coordinates')->lat,
        'long' => (float) $institution->get('field_coordinates')->lng,
        'title' => $institution->getTitle(),
        'render_teaser' => $teaser_render,
        'render_full' => $full_render,
        'category' => $institution->get('field_institution_roles')->target_id,
        'country' => $country_iso2,
      ];
    }

    $all_categories = [];
    $category_terms = $this->entityTypeManager
      ->getStorage('taxonomy_term')
      ->loadByProperties([
        'vid' => 'institution_roles',
      ]);

    foreach ($category_terms as $term) {
      $all_categories[] = [
        'id' => $term->id(),
        'color' => $term->get('field_color')->color ?? '#000000',
        'name' => $term->label(),
      ];
    }

    return [
      '#theme' => 'parc_governance_map',
      '#map_id' => $map_id,
      '#attached' => [
        'library' => [
          'parc_governance_map/governance_map',
        ],
        'drupalSettings' => [
          'parc_governance_map' => [
            $map_id => [
              'institutions' => $institutions,
            ],
            'categories' => $all_categories,
          ],
        ],
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function evenEmpty() {
    return TRUE;
  }

}
