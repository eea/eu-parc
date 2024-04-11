<?php

namespace Drupal\parc_core\Controller;

use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Extension\ThemeExtensionList;
use Drupal\Core\Render\HtmlResponse;
use Drupal\Core\Controller\ControllerBase;
use Drupal\node\NodeInterface;
use Drupal\parc_core\ParcEventsManager;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Controller for PARC routes.
 *
 * @package Drupal\parc_core\Controller
 */
class ParcController extends ControllerBase implements ContainerInjectionInterface {

  /**
   * The theme extension list.
   *
   * @var \Drupal\Core\Extension\ThemeExtensionList
   */
  protected $themeExtensionList;

  /**
   * The events manager.
   *
   * @var \Drupal\parc_core\ParcEventsManager
   */
  protected $eventsManager;

  /**
   * The current request.
   *
   * @var \Symfony\Component\HttpFoundation\Request
   */
  protected $request;

  /**
   * Constructs a ParcController object.
   *
   * @param \Drupal\Core\Extension\ThemeExtensionList $theme_extension_list
   *   The theme extension list.
   * @param \Drupal\parc_core\ParcEventsManager $events_manager
   *   The event manager.
   * @param \Symfony\Component\HttpFoundation\RequestStack $request_stack
   *   The request stack.
   */
  public function __construct(ThemeExtensionList $theme_extension_list, ParcEventsManager $events_manager, RequestStack $request_stack) {
    $this->themeExtensionList = $theme_extension_list;
    $this->eventsManager = $events_manager;
    $this->request = $request_stack->getCurrentRequest();
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('extension.list.theme'),
      $container->get('parc_core.events_manager'),
      $container->get('request_stack'),
    );
  }

  /**
   * Generates the Open Graph image for an event.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The event.
   * @param string $type
   *   The social media type.
   *
   * @return \Drupal\Core\Render\HtmlResponse
   *   The HTML response.
   */
  public function eventOgImage(NodeInterface $node, $type = 'standard') {
    $width = 1200;
    $height = 630;

    $margin = 40;
    $margin_bottom = $type == 'standard' ? 0 : 100;

    /** @var \Drupal\taxonomy\TermInterface $category */
    $category = $node->get('field_categories')->entity;
    $category_name = $category->getName();
    $category_font_size = 60;

    $location = $this->eventsManager->getEventLocation($node);
    $location_font_size = 40;

    $color = $this->request->query->get('color');
    if (empty($color)) {
      $color = $category->get('field_colors')->color;
    }
    [$r, $g, $b] = sscanf($color, "#%02x%02x%02x");

    $date = $this->eventsManager->getEventFormattedDate($node);

    $year = $this->eventsManager->getEventFormattedDate($node, TRUE);
    $year_font_size = 30;
    $year_width = strlen($year) > 4 ? 270 : 130;

    $image_p = imagecreate($width, $height);
    imagecolorallocate($image_p, $r, $g, $b);
    $white = imagecolorallocate($image_p, 255, 255, 255);

    $font = $this->themeExtensionList->getPath('parc') . '/fonts/Satoshi-Bold.ttf';
    $font_size = $width / strlen($date) * 1.3;

    // Write category name.
    imagettftext($image_p, $category_font_size, 0, $margin, $category_font_size + $margin, $white, $font, $category_name);

    // Write year.
    imagettftext($image_p, $year_font_size, 0, $width - $year_width, $year_font_size + $margin, $white, $font, $year);

    // Write location.
    imagettftext($image_p, $location_font_size, 0, $margin, $height - $location_font_size - $margin_bottom, $white, $font, $location);

    // Write date.
    imagettftext($image_p, $font_size, 0, $margin, $font_size + $category_font_size + 80, $white, $font, $date);

    ob_start();
    imagejpeg($image_p, NULL, 100);
    $image_string = ob_get_clean();

    $response = new HtmlResponse($image_string, 200, [
      'Content-Type' => 'image/jpeg',
    ]);
    $response->addCacheableDependency($node);
    return $response;
  }

}
