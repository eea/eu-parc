<?php

namespace Drupal\parc_core;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\node\NodeInterface;
use Drupal\taxonomy\TermInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Theme\ThemeManagerInterface;
use Drupal\views\ViewExecutable;

/**
 * Defines a class for reacting to preprocess Views.
 *
 * @internal
 */
class ParcCoreViews implements ContainerInjectionInterface {

  use StringTranslationTrait;

  /**
   * The Entity Type Manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The Theme Manager service.
   *
   * @var \Drupal\Core\Theme\ThemeManagerInterface
   */
  protected $themeManager;

  /**
   * Constructs a new ParcCoreViews object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   Entity type manager service.
   * @param \Drupal\Core\Theme\ThemeManagerInterface $theme_manager
   *   Theme manager.
   */
  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
    ThemeManagerInterface $theme_manager
  ) {
    $this->entityTypeManager = $entity_type_manager;
    $this->themeManager = $theme_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('theme.manager')
    );
  }

  /**
   * Views Pre render.
   *
   * @see hook_views_pre_render()
   */
  public function viewsPreRender(ViewExecutable &$view) {
    if (
      $view->id() === 'content_events'
    ) {

      if (
          $view->current_display === 'page_events' ||
          $view->current_display === 'block_1' ||
          $view->current_display === 'block_events_front_page' ||
          $view->current_display === 'block_related_events' ||
          $view->current_display == 'embed_1' ||
          $view->current_display == 'related_events_no_conditions' ||
          $view->current_display == 'related_training_types'
      ) {

        $defaultOverlay = '#8631A7';

        $this->getOverlaysOrder(
        $view,
        'events_category',
        'field_categories',
        'field_colors',
        $defaultOverlay
        );
      }
    }

    $full_results = !empty(\Drupal::request()->query->get('full_results'));
    if ($view->id() == 'search' && !$full_results) {
      $view->setAjaxEnabled(FALSE);
    }

    if ($view->id() == 'projects') {
      $results = $view->result;
      usort($results, function ($a, $b) {
        $a = $a->_entity;
        $b = $b->_entity;
        $topic_a = $a->get('field_project_topics')->entity;
        $topic_b = $b->get('field_project_topics')->entity;

        $count_a = $a->get('field_project_topics')->count();
        $count_b = $b->get('field_project_topics')->count();

        $weight_a = $topic_a->get('weight')->value;
        $weight_b = $topic_b->get('weight')->value;

        if ($count_a != $count_b) {
          return $count_a <=> $count_b;
        }

        if ($weight_a != $weight_b) {
          return $weight_a <=> $weight_b;
        }

        return strcasecmp($a->getTitle(), $b->getTitle());
      });
      $view->result = $results;
    }
  }

  /**
   * Get overlays in the desired order..
   *
   * @param string $vocabulary
   *   Vocabulary Id.
   * @param string $category
   *   Category Id.
   * @param string $fieldOverlay
   *   Field overlay Id.
   * @param string $defaultOverlay
   *   Default Overlay.
   */
  public function getOverlaysOrder(
    ViewExecutable &$view,
    string $vocabulary,
    string $category,
    string $fieldOverlay,
    string $defaultOverlay
  ) {
    $terms = $this->entityTypeManager->getStorage('taxonomy_term')
      ->loadTree($vocabulary, 0, NULL, TRUE);

    // Get the overlays data.
    $overlays = [];
    foreach ($terms as $term) {
      $overlays[$term->id()]['current'] = 0;
      if (
        $term->hasField($fieldOverlay) &&
        !$term->get($fieldOverlay)->isEmpty()
      ) {

        if ($fieldOverlay === 'field_overlay') {
          $termOverlays = $term->get($fieldOverlay)->referencedEntities();
          foreach ($termOverlays as $key => $termOverlay) {
            $overlays[$term->id()]['overlays'][$key] = $termOverlay->get(
              'field_media_image_2'
            )->entity->createFileUrl();
          }
        }
        elseif ($fieldOverlay === 'field_colors') {
          $termOverlays = $term->get($fieldOverlay)->getValue();
          foreach ($termOverlays as $key => $termOverlay) {
            $overlays[$term->id()]['overlays'][$key] = $termOverlay['color'];
          }
        }
      }

      // Set max values.
      if (isset($overlays[$term->id()]['overlays'])) {
        $overlays[$term->id()]['max'] = count(
          $overlays[$term->id()]['overlays']
        ) - 1;
      }
      else {
        $overlays[$term->id()]['max'] = 0;
      }
    }

    // Assign the overlays value for theming.
    foreach ($view->result as &$result) {
      if (
        $result->_entity->hasField($category) &&
        !$result->_entity->get($category)->isEmpty()
      ) {
        /** @var \Drupal\node\NodeInterface $node */
        $node = $result->_entity;
        if (!$node->get($category)->entity instanceof TermInterface) {
          continue;
        }
        $termId = $node->get($category)->entity->id();
        // Get the overlay value for the current content.
        if ($overlays[$termId]['current'] > $overlays[$termId]['max']) {
          $overlay = 0;
          $overlays[$termId]['current'] = 1;
        }
        else {
          $overlay = $overlays[$termId]['current']++;
        }

        // Assing the overlay value.
        $node->overlay = $overlays[$termId]['overlays'][$overlay] ??
          $defaultOverlay;
      }
      else {
        $node->overlay = $defaultOverlay;
      }

      if ($node->hasField('field_training_type')
        && !$node->get('field_training_type')->isEmpty()) {
        /** @var \Drupal\taxonomy\TermInterface $training_type */
        $training_type = $node->get('field_training_type')->entity;
        if ($training_type instanceof TermInterface
          && !$training_type->get('field_color')->isEmpty()) {
          $node->overlay = $training_type->get('field_color')->color;
        }
      }
    }

  }

}
