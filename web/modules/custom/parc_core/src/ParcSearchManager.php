<?php

namespace Drupal\parc_core;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Http\RequestStack;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Url;
use Drupal\node\NodeInterface;

/**
 * Defines a class for reacting to preprocess Views.
 *
 * @internal
 */
class ParcSearchManager {

  use StringTranslationTrait;

  /**
   * The Entity Type Manager service.
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
   * The current route match.
   *
   * @var \Drupal\Core\Routing\CurrentRouteMatch
   */
  protected $routeMatch;

  /**
   * Constructs a new ParcSearchManager object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   Entity type manager service.
   * @param \Drupal\Core\Http\RequestStack $request_stack
   *   The request stack.
   * @param \Drupal\Core\Routing\CurrentRouteMatch $route_match
   *   The current route match.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, RequestStack $request_stack, CurrentRouteMatch $route_match) {
    $this->entityTypeManager = $entity_type_manager;
    $this->request = $request_stack->getCurrentRequest();
    $this->routeMatch = $route_match;
  }

  /**
   * Get the URL to a node page.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node.
   *
   * @return \Drupal\Core\Url
   *   The URL to the node.
   */
  public function getNodeUrl(NodeInterface $node) {
    switch ($node->bundle()) {
      case 'deliverables':
        return Url::fromUserInput('/deliverables');
      case 'institution':
        return Url::fromUserInput('/institutions-interactive-map');
      case 'publications':
        return Url::fromUserInput('/scientific-publications', [
          'fragment' => 'article-' . $node->id(),
        ]);

      default:
        return $node->toUrl();
    }
  }

  /**
   * Get the content type label (plural).
   *
   * @param string $content_type
   *   The bundle ID.
   *
   * @return string
   *   The content type label.
   */
  public function getContentTypeAutocompleteLabel(string $content_type) {
    switch ($content_type) {
      case 'events':
        return $this->t('Events')->__toString();

      case 'article':
        return $this->t('News')->__toString();

      case 'thematic_areas':
        return $this->t('Thematic areas')->__toString();

      case 'deliverables':
        return $this->t('Deliverables')->__toString();

      case 'institution':
        return $this->t('Institutions')->__toString();

      case 'publications':
        return $this->t('Publications')->__toString();

      default:
        return $this->t('Pages')->__toString();
    }
  }

  public function getFullSearchLinkForBundle(string $content_type) {
    switch ($content_type) {
      case 'events':
        return Url::fromUserInput('/events');
      case 'article':
        return Url::fromUserInput('/news');
      case 'thematic_areas':
        return Url::fromUserInput('/thematic-areas');
      case 'publications':
        return Url::fromUserInput('/scientific-publications');

      default:
        return Url::fromRoute($this->routeMatch->getRouteName(),
          $this->routeMatch->getRawParameters()->all(),
          [
            'query' => [
              'full_results' => TRUE,
              'type' => $content_type,
              'text' => $this->request->query->get('text'),
            ],
          ]
        );
    }
  }

}
