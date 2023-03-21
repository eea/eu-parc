<?php

namespace Drupal\parc_core\EventSubscriber;

use Drupal\Core\Url;
use Drupal\taxonomy\Entity\Term;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Cache\CacheableRedirectResponse;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Symfony\Component\HttpKernel\Event\KernelEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Define ParcEventSubscriber class.
 *
 * @package Drupal\parc_core
 */
class ParcEventSubscriber implements EventSubscriberInterface {

  /**
   * The Entity Type Manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * {@inheritdoc}
   */
  public function __construct(
    EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * A method to be called whenever a kernel.request event is dispatched.
   *
   * It invokes a rabbit hole behavior on an entity in the request if
   * applicable.
   *
   * @param \Symfony\Component\HttpKernel\Event\KernelEvent $event
   *   The event triggered by the request.
   */
  public function onRequest(KernelEvent $event) {
    $term = $this->getEntity($event);
    // Redirect users to news pages.
    if ($term instanceof Term) {
      switch ($term->bundle()) {
        case 'news_category':
          $url = Url::fromRoute('view.news_events.page_news');
          $options = [
            'query' => [
              'category[' . $term->id() . ']' => $term->id(),
              'close' => TRUE,
            ],
          ];
          $url->setOptions($options);
          $event->setResponse(new CacheableRedirectResponse($url->toString()));
          break;

        case 'events_category':
          $url = Url::fromRoute('view.content_events.page_events');
          $options = [
            'query' => [
              'category[' . $term->id() . ']' => $term->id(),
              'close' => TRUE,
            ],
          ];
          $url->setOptions($options);
          $event->setResponse(new CacheableRedirectResponse($url->toString()));
          break;

      }
    }
  }

  /**
   * {@inheritdoc}
   */
  public function getEntity(KernelEvent $event) {
    $request = $event->getRequest();
    // Don't process events with HTTP exceptions - those have either been thrown
    // by us or have nothing to do with rabbit hole.
    if ($request->get('exception') != NULL) {
      return FALSE;
    }

    // Get the route from the request.
    if ($route = $request->get('_route')) {
      // Only continue if the request route is the an entity canonical.
      if (preg_match('/^entity\.(.+)\.canonical$/', $route)) {
        $entity = $request->get('taxonomy_term');
        if (isset($entity) && $entity instanceof ContentEntityInterface) {
          return $entity;
        }
      }
    }

    return FALSE;
  }

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents() {
    $events['kernel.request'] = ['onRequest', 28];
    return $events;
  }

}
