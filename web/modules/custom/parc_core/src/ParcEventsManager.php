<?php

namespace Drupal\parc_core;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Url;
use Drupal\file\FileInterface;
use Drupal\media\MediaInterface;
use Drupal\node\NodeInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Useful functions for the events.
 */
class ParcEventsManager {

  use StringTranslationTrait;

  /**
   * The term ID for Trainings.
   */
  public const EVENT_TRAINING_TID = 91;

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
   * Constructs a new ParcEventsManager object.
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
   * Check if the current page is a training event.
   *
   * @return bool
   *   True if the page is a training event.
   */
  public function isTrainingEventPage() {
    $node = $this->routeMatch->getParameter('node');

    if (!$node instanceof NodeInterface) {
      return FALSE;
    }

    if ($node->get('field_categories')->target_id != static::EVENT_TRAINING_TID) {
      return FALSE;
    }

    return TRUE;
  }

  /**
   * Check if the current page is a training events view page.
   *
   * @return bool
   *   True if the page is a training events view page.
   */
  public function isTrainingEventsViewPage() {
    $route_name = $this->routeMatch->getRouteName();

    if ($route_name != 'view.content_events.page_events') {
      return FALSE;
    }

    $categories = $this->request->query->all()['category'] ?? [];
    if (!empty($this->request->query->all()['training_topic']) && empty($categories)) {
      return TRUE;
    }

    if (!empty($categories[static::EVENT_TRAINING_TID])
      && count($categories) == 1) {
      return TRUE;
    }

    return FALSE;
  }

  /**
   * Check if we should display the training topic filter.
   *
   * @return bool
   *   True if we should display the filter.
   */
  public function shouldDisplayTrainingTopicFilter() {
    $categories = $this->request->query->all()['category'] ?? [];
    if (!empty($categories[static::EVENT_TRAINING_TID])) {
      return TRUE;
    }

    return FALSE;
  }

}
