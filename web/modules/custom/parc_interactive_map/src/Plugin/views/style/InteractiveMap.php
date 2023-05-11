<?php

namespace Drupal\parc_interactive_map\Plugin\views\style;

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

      $color = '#000000';
      $category = NULL;
      /** @var \Drupal\taxonomy\TermInterface $role */
      $role = $institution->get('field_institution_roles')->entity;
      if (!empty($role)) {
        $category = $role->id();
        $color = $role->get('field_color')->color ?? '#000000';
      }

      $roles = [];
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
        'image' => $this->getInstitutionImage($institution),
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
          ],
        ],
      ],
    ];
  }

  /**
   * Retrieve the base64 image of an institution.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The institution.
   *
   * @return string
   *   The image base64.
   */
  protected function getInstitutionImage(NodeInterface $node) {
    $media = $node->get('field_media_image')->entity;
    if (empty($media)) {
      $media = $this->entityTypeManager
        ->getStorage('media')
        ->loadByProperties([
          'uuid' => '15f79f08-9928-44f7-a909-8ff476217a2e',
        ]);
      if (empty($media)) {
        return NULL;
      }
      $media = reset($media);
    }

    /** @var \Drupal\file\FileInterface $file */
    $file = $media->get('field_media_image')->entity;
    if (empty($file)) {
      return NULL;
    }

    if (!file_exists($file->getFileUri())) {
      return;
    }

    $image_style = $this->entityTypeManager
      ->getStorage('image_style')
      ->load('thumbnail');
    $small_image = $image_style->buildUri($file->getFileUri());
    if (!file_exists($small_image)) {
      $image_style->createDerivative($file->getFileUri(), $small_image);
    }

    // Encode the image in base64 to speed up loading times.
    $image_binary = fread(fopen($small_image, 'r'), filesize($small_image));
    $file_type = mime_content_type($small_image);
    $image_base64 = 'data:' . $file_type . ';base64,' . base64_encode($image_binary);
    return $image_base64;
  }

  /**
   * {@inheritdoc}
   */
  public function evenEmpty() {
    return TRUE;
  }

}
