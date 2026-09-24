<?php

namespace Drupal\parc_mind_map\Controller;

use Drupal\Core\Cache\CacheableJsonResponse;
use Drupal\Core\Controller\ControllerBase;
use Drupal\parc_mind_map\MindMapGraphBuilder;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Serves the mind map graph as JSON.
 *
 * @package Drupal\parc_mind_map\Controller
 */
class MindMapController extends ControllerBase {

  /**
   * The mind map graph builder.
   *
   * @var \Drupal\parc_mind_map\MindMapGraphBuilder
   */
  protected $graphBuilder;

  /**
   * Constructs a MindMapController object.
   *
   * @param \Drupal\parc_mind_map\MindMapGraphBuilder $graph_builder
   *   The mind map graph builder.
   */
  public function __construct(MindMapGraphBuilder $graph_builder) {
    $this->graphBuilder = $graph_builder;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('parc_mind_map.graph_builder')
    );
  }

  /**
   * Returns the entities of the mind map.
   *
   * @return \Drupal\Core\Cache\CacheableJsonResponse
   *   The graph nodes.
   */
  public function data() {
    return $this->respond($this->graphBuilder->getNodes());
  }

  /**
   * Returns the relationships between the entities of the mind map.
   *
   * @return \Drupal\Core\Cache\CacheableJsonResponse
   *   The graph edges.
   */
  public function edges() {
    return $this->respond($this->graphBuilder->getEdges());
  }

  /**
   * Builds the JSON response for a part of the graph.
   *
   * @param array $payload
   *   The list to serialize.
   *
   * @return \Drupal\Core\Cache\CacheableJsonResponse
   *   The response.
   */
  protected function respond(array $payload) {
    $response = new CacheableJsonResponse($payload);
    $response->addCacheableDependency($this->graphBuilder->getCacheableMetadata());
    $response->headers->set('Access-Control-Allow-Origin', '*');
    return $response;
  }

}
