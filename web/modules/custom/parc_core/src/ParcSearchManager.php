<?php

namespace Drupal\parc_core;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Url;
use Drupal\file\FileInterface;
use Drupal\media\MediaInterface;
use Drupal\node\NodeInterface;
use Drupal\taxonomy\TermInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Useful functions for the search page.
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
   * @param \Symfony\Component\HttpFoundation\RequestStack $request_stack
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
   * Get the URL to a node page in the search teaser.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node.
   *
   * @return \Drupal\Core\Url|null
   *   The URL to the node.
   */
  public function getNodeSearchTeaserUrl(NodeInterface $node) {
    switch ($node->bundle()) {
      case 'deliverables':
        $url = Url::fromUserInput('/deliverables');
        $media = $node->get('field_media')->entity;
        if (!$media instanceof MediaInterface) {
          return $url;
        }

        $file = $media->get('field_media_document')->entity;
        if (!$file instanceof FileInterface) {
          return $url;
        }

        return Url::fromUserInput($file->createFileUrl());
      case 'institution':
        return Url::fromUserInput('/partners?focus=' . $node->id());
      case 'laboratory':
        return Url::fromUserInput('/hbmlabnetwork?focus=' . $node->id());
      case 'publications':
        return Url::fromUserInput('/scientific-publications', [
          'query' => [
            'publication' => $node->id(),
          ],
        ]);
      case 'indicator':
        $topic = $node->get('field_indicator_topic')->entity;
        if (!$topic instanceof TermInterface) {
          return NULL;
        }
        $query = ['tab' => $node->get('field_indicator_type')->value . '-' . $topic->id() . '-tab'];
        return Url::fromRoute(
          'entity.taxonomy_term.canonical',
          ['taxonomy_term' => $topic->id()],
          ['query' => $query, 'fragment' => 'indicator-' . $node->id()],
        );

      case 'project':
        if (!$node->get('field_show_link')->value) {
          return Url::fromUserInput('/projects');
        }
        return $node->toUrl();

      case 'learning_material':
        return Url::fromUserInput('/learning-materials', ['fragment' => 'material-' . $node->id()]);

      default:
        return $node->toUrl();
    }
  }

  /**
   * Get the URL to a node page in an autocomplete widget.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node.
   *
   * @return \Drupal\Core\Url
   *   The URL to the node.
   */
  public function getNodeAutocompleteUrl(NodeInterface $node) {
    return $this->getNodeSearchTeaserUrl($node);
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
        return $this->t('Partners')->__toString();

      case 'laboratory':
        return $this->t('Laboratories')->__toString();

      case 'publications':
        return $this->t('Publications')->__toString();

      case 'learning_material':
        return $this->t('Learning materials')->__toString();

      case 'project':
        return $this->t('Projects')->__toString();

      case 'indicator':
        return $this->t('Indicators')->__toString();

      default:
        return $this->t('Other content')->__toString();
    }
  }

  /**
   * Get the URL to the full search page.
   *
   * @param string $content_type
   *   The content type.
   *
   * @return \Drupal\Core\Url
   *   The URL.
   */
  public function getFullSearchLinkForBundle(string $content_type) {
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

  /**
   * Check if we are displaying the full results of the search page.
   *
   * @return bool
   *   True if we are displaying the full results.
   */
  public function isFullResultsPage() {
    return !empty($this->request->query->get('full_results'));
  }

}
