<?php

namespace Drupal\parc_interactive_map\Plugin\views\style;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormStateInterface;
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
   * {@inheritdoc}
   */
  public $usesFields = FALSE;

  /**
   * The category field.
   *
   * @var string
   */
  protected $categoryField;

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
  protected function defineOptions() {
    $options = parent::defineOptions();
    $options['category_field'] = ['default' => 'field_institution_roles'];

    return $options;
  }

  /**
   * {@inheritdoc}
   */
  public function buildOptionsForm(&$form, FormStateInterface $form_state) {
    parent::buildOptionsForm($form, $form_state);
    $form['category_field'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Category field'),
      '#default_value' => $this->options['category_field'] ?? 'field_institution_roles',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function render() {
    $this->categoryField = $this->options['category_field'];

    $institutions = [];

    $map_id = uniqid();
    $node_bundle = 'institution';

    foreach ($this->view->result as $item) {
      $node = $item->_entity;

      if (!$node instanceof NodeInterface) {
        continue;
      }

      $node_bundle = $node->bundle();
      $teaser_render = $this->nodeViewBuilder->view($node, 'teaser');
      $teaser_render = $this->renderer->render($teaser_render);

      $full_render = $this->nodeViewBuilder->view($node);
      $full_render = $this->renderer->render($full_render);

      $country_label = NULL;
      $country = $node->get('field_country')->entity;
      if ($country instanceof TermInterface) {
        $country_label = $country->label();
      }

      $color = '#000000';
      $category_id = NULL;
      /** @var \Drupal\taxonomy\TermInterface $category */
      $category = $this->getDisplayedCategory($node);
      if (!empty($category)) {
        $category_id = $category->id();
        $color = $category->get('field_color')->color ?? '#000000';
      }

      $roles = [
        'main_secondary' => [],
        'additional' => [],
      ];
      foreach ($node->get($this->categoryField)->referencedEntities() as $category) {
        $role_type = 'main_secondary';
        if ($category->hasField('field_role_type') && !$category->get('field_role_type')
            ->isEmpty()) {
          $role_type = $category->get('field_role_type')->value;
        }
        $roles[$role_type][] = [
          'label' => $category->label(),
          'color' => $category->get('field_color')->color ?? '#000000',
          'type' => $role_type,
          'show_type' => $this->categoryField == 'field_institution_roles',
        ];
      }

      $institutions[] = [
        'id' => $node->id(),
        'lat' => (float) $node->get('field_coordinates')->lat,
        'long' => (float) $node->get('field_coordinates')->lng,
        'title' => $node->getTitle(),
        'render_teaser' => $teaser_render,
        'render_full' => $full_render,
        'category' => $category_id,
        'country' => $country_label,
        'color' => $color,
        'roles' => $roles,
        'content_type' => $node->bundle(),
      ];
    }

    $all_categories = [];

    if (!empty($node)) {
      $target_bundle = $node->get($this->categoryField)
        ->getFieldDefinition()
        ->getSetting('handler_settings')['target_bundles'];
      $target_bundle = reset($target_bundle);

      if (!empty($target_bundle)) {
        $category_terms = $this->entityTypeManager->getStorage('taxonomy_term')
          ->loadByProperties([
            'vid' => $target_bundle,
          ]);

        foreach ($category_terms as $term) {
          $all_categories[] = [
            'id' => $term->id(),
            'color' => $term->get('field_color')->color ?? '#000000',
            'name' => $term->label(),
          ];
        }
      }
    }

    return [
      '#theme' => 'parc_interactive_map',
      '#map_id' => $map_id,
      '#map_type' => $node_bundle,
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
   * Retrieve a node's displayed role.
   *
   * If there is a filter on the "institution type" facet,
   * we will display one of the selected filters as the role.
   * Otherwise, we will display the first role of the institution.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node.
   *
   * @return \Drupal\taxonomy\TermInterface
   *   The main role.
   */
  protected function getDisplayedCategory(NodeInterface $node) {
    if ($this->categoryField != 'field_institution_roles') {
      return $this->getDefaultCategory($node);
    }

    $query = \Drupal::request()->query->all()['f'] ?? [];

    // If there is no query, return the first role.
    if (empty($query)) {
      return $this->getDefaultCategory($node);
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
      return $this->getDefaultCategory($node);
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
  protected function getDefaultCategory(NodeInterface $node) {
    return $node->get($this->categoryField)->entity;
  }

  /**
   * {@inheritdoc}
   */
  public function evenEmpty() {
    return TRUE;
  }

}
