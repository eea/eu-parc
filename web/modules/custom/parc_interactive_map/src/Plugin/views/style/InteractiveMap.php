<?php

namespace Drupal\parc_interactive_map\Plugin\views\style;

use Drupal\Core\Config\ConfigFactoryInterface;
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
 *   id = "interactive_map",
 *   title = @Translation("Interactive map"),
 *   help = @Translation("Display results as a map"),
 *   theme = "views_view_interactive_map",
 *   display_types = {"normal"}
 * )
 */
class InteractiveMap extends StylePluginBase {

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
   * The module config.
   *
   * @var \Drupal\Core\Config\ImmutableConfig
   */
  protected $config;

  /**
   * Constructs a InteractiveMap object.
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
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   The config factory.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityTypeManagerInterface $entity_type_manager, RendererInterface $renderer, ConfigFactoryInterface $config_factory) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);

    $this->entityTypeManager = $entity_type_manager;
    $this->nodeViewBuilder = $entity_type_manager->getViewBuilder('node');
    $this->renderer = $renderer;
    $this->config = $config_factory->get('parc_interactive_map.settings');
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
      $container->get('renderer'),
      $container->get('config.factory')
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

      $color = '#000000';
      $category = NULL;
      /** @var \Drupal\taxonomy\TermInterface $role */
      $role = $this->getInstitutionDisplayedRole($institution);
      if (!empty($role)) {
        $category = $role->id();
        $color = $role->get('field_color')->color ?? '#000000';
      }

      $roles = [
        'main_secondary' => [],
        'additional' => [],
      ];
      foreach ($institution->get('field_institution_roles')->referencedEntities() as $role) {
        $role_type = $role->get('field_role_type')->value;
        if (empty($role_type)) {
          $role_type = 'main_secondary';
        }
        $roles[$role_type][] = [
          'label' => $role->label(),
          'color' => $role->get('field_color')->color ?? '#000000',
          'type' => $role->get('field_role_type')->value,
        ];
      }

      $institutions[] = [
        'id' => $institution->id(),
        'lat' => (float) $institution->get('field_coordinates')->lat,
        'long' => (float) $institution->get('field_coordinates')->lng,
        'title' => $institution->getTitle(),
        'render_teaser' => $teaser_render,
        'render_full' => $full_render,
        'category' => $category,
        'country' => $country_iso2,
        'color' => $color,
        'roles' => $roles,
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
      '#theme' => 'parc_interactive_map',
      '#map_id' => $map_id,
      '#attached' => [
        'library' => [
          'parc_interactive_map/interactive_map',
        ],
        'drupalSettings' => [
          'parc_interactive_map' => [
            $map_id => [
              'institutions' => $institutions,
            ],
            'categories' => $all_categories,
            'map_api_key' => $this->config->get('map_api_key'),
          ],
        ],
      ],
    ];
  }

  /**
   * Retrieve an institution's displayed role.
   *
   * If there is a filter on the "institution type" facet,
   * we will display one of the selected filters as the role.
   * Otherwise, we will display the first role of the institution.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The institution.
   *
   * @return \Drupal\taxonomy\TermInterface
   *   The main role.
   */
  protected function getInstitutionDisplayedRole(NodeInterface $node) {
    $query = \Drupal::request()->query->get('f');

    // If there is no query, return the first role.
    if (empty($query)) {
      return $this->getInstitutionDefaultRole($node);
    }

    // Check filtered roles.
    $filtered_institution_roles = [];
    foreach ($query as $filter) {
      if (strpos($filter, 'institution_type:') === FALSE) {
        continue;
      }

      $institution_type = str_replace('institution_type:', '', $filter);
      $filtered_institution_roles[] = $institution_type;
    }

    // If there are no filtered roles, return the first institution role.
    if (empty($filtered_institution_roles)) {
      return $this->getInstitutionDefaultRole($node);
    }

    // Return the first institution role that matches one of the filters.
    foreach ($node->get('field_institution_roles')->referencedEntities() as $role) {
      if (in_array($role->id(), $filtered_institution_roles)) {
        return $role;
      }
    }
  }

  /**
   * Retrieve an institution's default role.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The institution.
   *
   * @return \Drupal\taxonomy\TermInterface
   *   The default role.
   */
  protected function getInstitutionDefaultRole(NodeInterface $node) {
    return $node->get('field_institution_roles')->entity;
  }

  /**
   * {@inheritdoc}
   */
  public function evenEmpty() {
    return TRUE;
  }

}
