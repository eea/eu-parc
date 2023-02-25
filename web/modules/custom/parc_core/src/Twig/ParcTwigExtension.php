<?php

namespace Drupal\parc_core\Twig;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Class ParcTwigExtension.
 */
class ParcTwigExtension extends AbstractExtension {
  /**
   * @file
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * Declare your custom twig filter here.
   *
   * @return array|\Twig_SimpleFilter[]
   */
  public function getFunctions() {
    return [
      new TwigFunction(
        'termColor',
        [$this, 'termColor']
      ),

      new TwigFunction(
        'termOverlay',
        [$this, 'termOverlay']
      ),

      new TwigFunction(
        'termOverlayTotal',
        [$this, 'termOverlayTotal']
      ),
    ];
  }

  /**
   * Function to remove only links from the html.
   *
   * @param $string
   *   Html as string
   *
   * @return string
   *   Filtered html
   */
  public function termColor($termId) {
    $term = $this->entityTypeManager->getStorage('taxonomy_term')->load($termId);
    if ($term && $term->hasField('field_color') && !$term->get('field_color')->isEmpty()) {
      $color = $term->get('field_color')->getValue();
    }
    elseif ($term && $term->hasField('field_colors') && !$term->get('field_colors')->isEmpty()) {
      $color = $term->get('field_colors')->getValue();
    }

    return isset($color[0]['color']) ? $color[0]['color'] : '#000000';
  }

  /**
   * Function to remove only links from the html.
   *
   * @param $string
   *   Html as string
   *
   * @return string
   *   Filtered html
   */
  public function termOverlay($termId, $weight) {
    $term = $this->entityTypeManager->getStorage('taxonomy_term')->load($termId);
    $theme = \Drupal::theme()->getActiveTheme();
    $overlay = '/' . $theme->getPath() . '/img/ovelay-default.svg';

    if ($term && $term->hasField('field_overlay') && !$term->get('field_overlay')->isEmpty()) {
      $svg = $term->get('field_overlay')->referencedEntities();
      if (isset($svg[$weight])) {
        $svg = $svg[$weight];
        $overlay = $svg->get('field_media_image_2')->entity->createFileUrl();
      }
    }

    return $overlay;
  }

  /**
   * Function to remove only links from the html.
   *
   * @param $string
   *   Html as string
   *
   * @return string
   *   Filtered html
   */
  public function termOverlayTotal($termId) {
    $overlay = [];
    $term = $this->entityTypeManager->getStorage('taxonomy_term')->load($termId);
    if ($term && $term->hasField('field_overlay') && !$term->get('field_overlay')->isEmpty()) {
      $overlay = $term->get('field_overlay')->referencedEntities();
    }

    return count($overlay) - 1;
  }

  /**
   * {@inheritdoc}
   *
   * @return string
   */
  public function getName() {
    return 'twig_extension.filter';
  }

}
