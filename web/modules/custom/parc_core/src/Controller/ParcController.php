<?php

namespace Drupal\parc_core\Controller;

use DateTime;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ThemeExtensionList;
use Drupal\Core\Render\HtmlResponse;
use Drupal\node\Entity\Node;
use Drupal\node\NodeInterface;
use Drupal\parc_core\ParcEventsManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\HtmlCommand;

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
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

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
  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('extension.list.theme'),
      $container->get('parc_core.events_manager'),
      $container->get('request_stack'),
      $container->get('entity_type.manager'),
      $container->get('renderer')
    );
  }

  /**
   * The renderer service.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * Constructs a ParcController object.
   *
   * @param \Drupal\Core\Extension\ThemeExtensionList $theme_extension_list
   *   The theme extension list.
   * @param \Drupal\parc_core\ParcEventsManager $events_manager
   *   The event manager.
   * @param \Symfony\Component\HttpFoundation\RequestStack $request_stack
   *   The request stack.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer service.
   */
  public function __construct(ThemeExtensionList $theme_extension_list, ParcEventsManager $events_manager, RequestStack $request_stack, EntityTypeManagerInterface $entity_type_manager, \Drupal\Core\Render\RendererInterface $renderer) {
    $this->themeExtensionList = $theme_extension_list;
    $this->eventsManager = $events_manager;
    $this->request = $request_stack->getCurrentRequest();
    $this->entityTypeManager = $entity_type_manager;
    $this->renderer = $renderer;
  }


  /**
   * Renders a node teaser.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The AJAX response.
   */
  public function renderNodeTeaser(NodeInterface $node) {
    $view_builder = $this->entityTypeManager->getViewBuilder('node');
    $render = $view_builder->view($node, 'teaser');
    
    $response = new AjaxResponse();
    $selector = '#topic-project-' . $node->id();
    $response->addCommand(new HtmlCommand($selector, $render));

    return $response;
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

    $image_p = imagecreate($width, $height);
    imagecolorallocate($image_p, $r, $g, $b);
    $white = imagecolorallocate($image_p, 255, 255, 255);

    $font = $this->themeExtensionList->getPath('parc') . '/fonts/Satoshi-Bold.ttf';
    $font_size = $width / strlen($date) * 1.1;

    // Write category name.
    imagettftext($image_p, $category_font_size, 0, $margin, $category_font_size + $margin, $white, $font, $category_name);

    // Write location.
    imagettftext($image_p, $location_font_size, 0, $margin, $height - $location_font_size - $margin_bottom, $white, $font, $location);

    // Write date.
    imagettftext($image_p, $font_size, 0, $margin, $font_size + $category_font_size + 80, $white, $font, $date);

    ob_start();
    imagejpeg($image_p, NULL, 100);
    $image_string = ob_get_clean();

    $response = new HtmlResponse($image_string, 200, [
      'Content-Type' => 'image/jpeg',
      'Content-Length' => strlen($image_string),
    ]);
    $response->addCacheableDependency($node);

    $cacheable_metadata = new CacheableMetadata();
    $cacheable_metadata->addCacheContexts(['url']);
    $response->addCacheableDependency($cacheable_metadata);

    return $response;
  }

  /**
   * Downloads SVG data as CSV.
   */
  public function downloadSvg($node_id) {
    $node_id = intval($node_id);
    if($node_id != 0){
      $node = Node::load($node_id);
      $node_data = $node->get('field_indicator_data')->getValue();
    }
    else{
      $query = $this->entityTypeManager()->getStorage('node')->getQuery()
                ->condition('type', 'publications')
                ->condition('status', 1)
                ->sort('created', 'DESC')
                ->accessCheck(FALSE);
      $nids = $query->execute();

      $publications = $this->entityTypeManager()->getStorage('node')->loadMultiple($nids);
      $node_data = [];

      foreach($publications as $node){
        $date = (new DateTime($node->get('field_publication_date')->value))->format('d.m.Y');
        $title = $node->get('title')->value;
        $node_data[0]["value"][] = [
          'Date' => $date,
          'Publication name' => $title
        ];
      }
      array_unshift($node_data[0]["value"], ["Date", "Publication name"]);
    }
    $csv_data = $this->generateCsv($node_data);
    return $this->createCsvResponse($csv_data);

  }

  /**
   * Generates CSV from data.
   */
  private function generateCsv(array $data): string {

    $csv_lines = [];
    $rows = $data[0]['value'];



    foreach ($rows as $row) {
      if (isset($row['weight'])) {
        unset($row['weight']);
      }
      if ($row === "") {
        continue;
      }
      $csv_lines[] = '"' . implode('","', $row) . '"';
    }

    // Join the CSV lines with new line characters.
    return implode("\n", $csv_lines);
  }

  /**
   * Sends response with CSV.
   *
   * @param string $csv_data
   *   Data to put in csv.
   *
   * @return \Symfony\Component\HttpFoundation\StreamedResponse
   *   The CSV response.
   */
  private function createCsvResponse(string $csv_data): StreamedResponse {

    $response = new StreamedResponse(function () use ($csv_data) {
      echo $csv_data;
    });
    $response->headers->set('Content-Type', 'text/csv');
    $response->headers->set('Content-Disposition', 'attachment; filename="data.csv"');

    return $response;
  }

}
