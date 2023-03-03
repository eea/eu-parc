<?php

namespace Drupal\parc_core\Twig;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleExtensionList;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Class ParcTwigExtension.
 */
class ParcTwigExtension extends AbstractExtension {

  /**
   * The Entity Type Manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The Module Extension List service.
   *
   * @var \Drupal\Core\Extension\ModuleExtensionList
   */
  protected $moduleList;

  /**
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The Entity Type Manager service
   * @param \Drupal\Core\Extension\ModuleExtensionList $module_list
   *   The Module Extension List service
   */
  public function __construct(
    EntityTypeManagerInterface $entity_type_manager
    // ModuleExtensionList $module_list
  ) {
    $this->entityTypeManager = $entity_type_manager;
    // $this->moduleList = $module_list;
  }

  /**
   * Declare your custom twig filter here.
   *
   * @return array|\Twig_SimpleFilter[]
   */
  public function getFunctions() {
    return [
      new TwigFunction('termColor', [$this, 'termColor']),
      new TwigFunction('termOverlay', [$this, 'termOverlay']),
      new TwigFunction('termOverlayTotal', [$this, 'termOverlayTotal']),
      new TwigFunction('cardFooterOverlay', [$this, 'cardFooterOverlay']),
    ];
  }

  /**
   * Returns the hex of given Term.
   *
   * @param string $termId
   *   Term id.
   *
   * @return string
   *   Hexcode.
   */
  public function termColor(string $termId) {
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
   * Returns the file overlay url of given Term.
   *
   * @param string $termId
   *   Term id.
   * @param mixed $weight
   *   Weight.
   *
   * @return string
   *   File url.
   */
  public function termOverlay(string $termId, mixed $weight) {
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
   * Returns the total of overlays for the given Term.
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
   * Returns Card Footer overlay.
   *
   * @return string
   *   Url of SVG file.
   */
  public function cardFooterOverlay() {
    $module = \Drupal::service('extension.list.module')->getPath('parc_core');
    $svg =  $module . '/assets/footer-overlay-2.svg';

    $database = \Drupal::database();
    $query = $database->select('media_field_data', 'm');
    $query->fields('m', ['mid'])
      ->condition('status', 1)
      ->condition('bundle', 'card_footer_overlay')
      ->range(0, 50);

    $medias = $query->execute()->fetchCol();

    if (!empty($medias)) {
      $mid = array_rand($medias);
      $media = $this->entityTypeManager->getStorage('media')->load($medias[$mid]);

      if (
        $media &&
        $media->hasField('field_media_image') &&
        !$media->get('field_media_image')->isEmpty()
      ) {
        $svg = $media->get('field_media_image')->entity->createFileUrl();
      }
    }

    return $svg;
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
