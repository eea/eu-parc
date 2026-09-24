<?php

namespace Drupal\parc_mind_map;

use Drupal\Component\Transliteration\TransliterationInterface;
use Drupal\Component\Utility\Unicode;
use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileUrlGeneratorInterface;
use Drupal\file\FileInterface;
use Drupal\media\MediaInterface;
use Drupal\node\NodeInterface;
use Drupal\taxonomy\TermInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Builds the mind map graph out of the PARC content model.
 *
 * Only relationships that are modelled as Drupal fields are exposed:
 *   - project topic -> project (node.project.field_project_topics)
 *   - project keyword -> project (node.project.field_project_keywords)
 *   - project -> partner (node.project.field_partners)
 *   - publication -> project (node.project.field_related_publications)
 *   - publication -> keyword (node.publications.field_key_words)
 *   - publication -> author (node.publications.field_authors)
 */
class MindMapGraphBuilder {

  /**
   * Maximum length of the "description" property of a graph node.
   */
  const DESCRIPTION_MAX_LENGTH = 500;

  /**
   * Image style used for the publication covers.
   */
  const COVER_IMAGE_STYLE = 'large';

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The file URL generator.
   *
   * @var \Drupal\Core\File\FileUrlGeneratorInterface
   */
  protected $fileUrlGenerator;

  /**
   * The transliteration service.
   *
   * @var \Drupal\Component\Transliteration\TransliterationInterface
   */
  protected $transliteration;

  /**
   * The cache backend holding the built graph.
   *
   * @var \Drupal\Core\Cache\CacheBackendInterface
   */
  protected $cache;

  /**
   * The request stack.
   *
   * @var \Symfony\Component\HttpFoundation\RequestStack
   */
  protected $requestStack;

  /**
   * The graph, keyed by "nodes" and "edges".
   *
   * @var array|null
   */
  protected $graph = NULL;

  /**
   * Cacheability of the generated graph.
   *
   * @var \Drupal\Core\Cache\CacheableMetadata|null
   */
  protected $cacheability = NULL;

  /**
   * Constructs a MindMapGraphBuilder object.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, FileUrlGeneratorInterface $file_url_generator, TransliterationInterface $transliteration, CacheBackendInterface $cache, RequestStack $request_stack) {
    $this->entityTypeManager = $entity_type_manager;
    $this->fileUrlGenerator = $file_url_generator;
    $this->transliteration = $transliteration;
    $this->cache = $cache;
    $this->requestStack = $request_stack;
  }

  /**
   * Returns the graph nodes, ready to be serialized.
   */
  public function getNodes(): array {
    $this->build();
    return array_values($this->graph['nodes']);
  }

  /**
   * Returns the graph edges, ready to be serialized.
   */
  public function getEdges(): array {
    $this->build();
    return array_values($this->graph['edges']);
  }

  /**
   * Returns the cacheability metadata of the generated graph.
   */
  public function getCacheableMetadata(): CacheableMetadata {
    $this->build();
    return $this->cacheability;
  }

  /**
   * Builds the whole graph.
   */
  protected function build(): void {
    if ($this->graph !== NULL) {
      return;
    }

    $request = $this->requestStack->getCurrentRequest();
    $cid = 'parc_mind_map:graph:' . ($request ? $request->getSchemeAndHttpHost() : '');
    if ($cached = $this->cache->get($cid)) {
      [$this->graph, $this->cacheability] = $cached->data;
      return;
    }

    $this->graph = ['nodes' => [], 'edges' => []];
    $this->cacheability = (new CacheableMetadata())
      ->setCacheTags([
        'node_list:project',
        'node_list:publications',
        'node_list:institution',
        'taxonomy_term_list:project_topics',
        'taxonomy_term_list:project_keywords',
        'taxonomy_term_list:publications',
      ])
      ->setCacheContexts(['url.site']);

    $this->buildProjectGraph();
    $this->buildPublicationGraph();

    $this->cache->set($cid, [$this->graph, $this->cacheability], CacheBackendInterface::CACHE_PERMANENT, $this->cacheability->getCacheTags());
  }

  /**
   * Adds the projects and everything hanging off them.
   */
  protected function buildProjectGraph(): void {
    foreach ($this->loadTerms('project_topics') as $term) {
      $this->addTermNode($term, 'project-topic');
    }
    foreach ($this->loadTerms('project_keywords') as $term) {
      $this->addTermNode($term, 'project-keyword');
    }

    foreach ($this->loadNodes('project') as $project) {
      $project_id = 'project-' . $project->id();
      $this->addNode([
        'id' => $project_id,
        'type' => 'project',
        'name' => $project->label(),
        'abbreviation' => $this->getFirstValue($project, 'field_project_abbreviation'),
        'url' => $this->getEntityUrl($project),
        'description' => $this->getDescription($project, 'body'),
      ]);

      foreach ($this->getReferencedEntities($project, 'field_project_topics') as $term) {
        $this->addEdge($this->addTermNode($term, 'project-topic'), $project_id, 'project-topic_project');
      }

      foreach ($this->getReferencedEntities($project, 'field_project_keywords') as $term) {
        $this->addEdge($this->addTermNode($term, 'project-keyword'), $project_id, 'project-keyword_project');
      }

      foreach ($this->getReferencedEntities($project, 'field_partners') as $partner) {
        $this->addEdge($project_id, $this->addPartnerNode($partner), 'project_partner');
      }

      foreach ($this->getReferencedEntities($project, 'field_related_publications') as $publication) {
        if ($publication->isPublished()) {
          $this->addEdge('article-' . $publication->id(), $project_id, 'article_project');
        }
      }
    }
  }

  /**
   * Adds the publications, their keywords and their authors.
   */
  protected function buildPublicationGraph(): void {
    foreach ($this->loadNodes('publications') as $publication) {
      $publication_id = 'article-' . $publication->id();
      $keywords = [];
      foreach ($this->getReferencedEntities($publication, 'field_key_words') as $term) {
        $keywords[] = $term->label();
        $this->addEdge($publication_id, $this->addTermNode($term, 'article-keyword'), 'article_article-keyword');
      }

      $authors = [];
      foreach ($this->getValues($publication, 'field_authors') as $author) {
        $author = trim($author);
        if ($author === '') {
          continue;
        }
        $authors[] = $author;
        $this->addEdge($publication_id, $this->addAuthorNode($author), 'article_author');
      }

      $this->addNode([
        'id' => $publication_id,
        'type' => 'article',
        'name' => $publication->label(),
        'url' => $this->getEntityUrl($publication),
        'authors' => implode(', ', $authors),
        'keywords' => implode(', ', $keywords),
        'date-of-publication' => $this->getPublicationDate($publication),
        'journal' => $this->getFirstValue($publication, 'field_journal'),
        'doi' => $this->getLinkUri($publication, 'field_doi_link'),
        'image' => $this->getCoverImageUrl($publication),
        'description' => $this->getDescription($publication, 'field_key_messages', 'body'),
      ]);
    }
  }

  /**
   * Adds a taxonomy term as a graph node.
   */
  protected function addTermNode(TermInterface $term, string $type): string {
    $id = $type . '-' . $term->id();
    $this->addNode([
      'id' => $id,
      'type' => $type,
      'name' => $term->label(),
      'description' => $this->getDescription($term, 'description'),
    ]);
    return $id;
  }

  /**
   * Adds an institution as a "partner" graph node.
   */
  protected function addPartnerNode(NodeInterface $partner): string {
    $id = 'partner-' . $partner->id();
    if (isset($this->graph['nodes'][$id])) {
      return $id;
    }

    $abbreviation = $this->getFirstValue($partner, 'field_abbreviation');
    $roles = array_map(
      fn (TermInterface $term) => $term->label(),
      $this->getReferencedEntities($partner, 'field_institution_roles')
    );
    $country = $this->getReferencedEntities($partner, 'field_country');

    $this->addNode([
      'id' => $id,
      'type' => 'partner',
      'name' => $abbreviation ?: $partner->label(),
      'fullname' => $partner->label(),
      'country' => $country ? reset($country)->label() : NULL,
      'itype' => $roles ? reset($roles) : NULL,
      'roles' => array_values($roles),
      'url' => $this->getEntityUrl($partner),
      'description' => $this->getDescription($partner, 'body'),
    ]);
    return $id;
  }

  /**
   * Adds an author as a graph node.
   */
  protected function addAuthorNode(string $name): string {
    $slug = $this->transliteration->transliterate($name, 'en', '');
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $slug));
    $slug = trim($slug, '-');
    $id = 'author-' . ($slug !== '' ? $slug : md5($name));

    $this->addNode([
      'id' => $id,
      'type' => 'author',
      'name' => $name,
    ]);
    return $id;
  }

  /**
   * Adds a graph node, keyed by its id so it is only emitted once.
   */
  protected function addNode(array $node): void {
    if (isset($this->graph['nodes'][$node['id']])) {
      return;
    }
    $this->graph['nodes'][$node['id']] = array_filter(
      $node,
      fn ($value) => $value !== NULL && $value !== '' && $value !== []
    );
  }

  /**
   * Adds a graph edge, de-duplicating identical relationships.
   */
  protected function addEdge(string $source, string $target, string $type): void {
    $this->graph['edges'][$type . '|' . $source . '|' . $target] = [
      'source' => $source,
      'target' => $target,
      'type' => $type,
    ];
  }

  /**
   * Loads all published nodes of a given bundle.
   */
  protected function loadNodes(string $bundle): array {
    $storage = $this->entityTypeManager->getStorage('node');
    $ids = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('type', $bundle)
      ->condition('status', NodeInterface::PUBLISHED)
      ->sort('nid')
      ->execute();

    return $ids ? $storage->loadMultiple($ids) : [];
  }

  /**
   * Loads all published terms of a given vocabulary.
   */
  protected function loadTerms(string $vocabulary): array {
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $ids = $storage->getQuery()
      ->accessCheck(TRUE)
      ->condition('vid', $vocabulary)
      ->condition('status', 1)
      ->sort('name')
      ->execute();

    return $ids ? $storage->loadMultiple($ids) : [];
  }

  /**
   * Returns the entities referenced by an entity reference field.
   */
  protected function getReferencedEntities($entity, string $field_name): array {
    if (!$entity->hasField($field_name) || $entity->get($field_name)->isEmpty()) {
      return [];
    }
    return $entity->get($field_name)->referencedEntities();
  }

  /**
   * Returns the raw values of a field.
   */
  protected function getValues($entity, string $field_name, string $property = 'value'): array {
    if (!$entity->hasField($field_name) || $entity->get($field_name)->isEmpty()) {
      return [];
    }
    return array_column($entity->get($field_name)->getValue(), $property);
  }

  /**
   * Returns the first value of a field.
   */
  protected function getFirstValue($entity, string $field_name): ?string {
    $values = $this->getValues($entity, $field_name);
    return $values ? trim((string) reset($values)) : NULL;
  }

  /**
   * Returns the target URL of a link field.
   */
  protected function getLinkUri($entity, string $field_name): ?string {
    $values = $this->getValues($entity, $field_name, 'uri');
    return $values ? (string) reset($values) : NULL;
  }

  /**
   * Returns a plain text description built from the first non-empty field.
   */
  protected function getDescription($entity, string ...$field_names): ?string {
    foreach ($field_names as $field_name) {
      if (!$entity->hasField($field_name) || $entity->get($field_name)->isEmpty()) {
        continue;
      }

      $item = $entity->get($field_name)->first()->getValue();
      $text = $item['summary'] ?? NULL;
      if (trim(strip_tags((string) $text)) === '') {
        $text = $item['value'] ?? NULL;
      }

      $text = trim(preg_replace('/\s+/u', ' ', strip_tags(str_replace('<', ' <', (string) $text))));
      $text = trim(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
      if ($text !== '') {
        return Unicode::truncate($text, static::DESCRIPTION_MAX_LENGTH, TRUE, TRUE);
      }
    }

    return NULL;
  }

  /**
   * Returns the publication date, formatted the way the map expects it.
   */
  protected function getPublicationDate(NodeInterface $publication): ?string {
    $value = $this->getFirstValue($publication, 'field_publication_date');
    if (empty($value)) {
      return NULL;
    }

    try {
      return (new \DateTime($value))->format('d.m.Y');
    }
    catch (\Exception $e) {
      return NULL;
    }
  }

  /**
   * Returns the absolute URL of the publication cover image.
   */
  protected function getCoverImageUrl(NodeInterface $publication): ?string {
    $media = $this->getReferencedEntities($publication, 'field_cover');
    if (!$media) {
      return NULL;
    }

    $media = reset($media);
    assert($media instanceof MediaInterface);
    $source_field = $media->getSource()->getConfiguration()['source_field'] ?? NULL;
    if (!$source_field || !$media->hasField($source_field) || $media->get($source_field)->isEmpty()) {
      return NULL;
    }

    $file = $media->get($source_field)->entity;
    if (!$file instanceof FileInterface) {
      return NULL;
    }

    $uri = $file->getFileUri();
    $style = $this->entityTypeManager->getStorage('image_style')->load(static::COVER_IMAGE_STYLE);
    if ($style && $style->supportsUri($uri)) {
      return $style->buildUrl($uri);
    }

    return $this->fileUrlGenerator->generateAbsoluteString($uri);
  }

  /**
   * Returns the absolute canonical URL of an entity.
   */
  protected function getEntityUrl($entity): ?string {
    if (!$entity->hasLinkTemplate('canonical')) {
      return NULL;
    }

    $generated = $entity->toUrl('canonical', ['absolute' => TRUE])->toString(TRUE);
    $this->cacheability->addCacheableDependency($generated);
    return $generated->getGeneratedUrl();
  }

}
