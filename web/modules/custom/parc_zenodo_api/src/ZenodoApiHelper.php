<?php

namespace Drupal\parc_zenodo_api;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Drupal\node\Entity\Node;
use Drupal\node\NodeInterface;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\RequestException;

/**
 * The Zenodo API Helper service.
 */
class ZenodoApiHelper {

  /**
   * A http client.
   *
   * @var \GuzzleHttp\ClientInterface
   */
  protected $httpClient;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The module config.
   *
   * @var \Drupal\Core\Config\ImmutableConfig
   */
  protected $config;

  /**
   * The logger service.
   *
   * @var \Drupal\Core\Logger\LoggerChannelInterface
   */
  protected $logger;

  /**
   * The default cover image.
   *
   * @var \Drupal\media\MediaInterface|null
   */
  protected $defaultCover;

  /**
   * Constructs a ZenodoApiHelper object.
   *
   * @param \GuzzleHttp\ClientInterface $http_client
   *   The HTTP Client.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   The config factory.
   * @param \Drupal\Core\Logger\LoggerChannelFactoryInterface $logger
   *   The logger service.
   */
  public function __construct(ClientInterface $http_client, EntityTypeManagerInterface $entity_type_manager, ConfigFactoryInterface $config_factory, LoggerChannelFactoryInterface $logger) {
    $this->httpClient = $http_client;
    $this->entityTypeManager = $entity_type_manager;
    $this->config = $config_factory->get('parc_zenodo_api.adminsettings');
    $this->logger = $logger->get('parc_zenodo_api');
  }

  /**
   * Get all Zenodo depositions.
   *
   * @return array
   *   The depositions.
   */
  public function getAllDepositions() {
    $token = $this->config->get('token');
    $url = 'https://zenodo.org/api/deposit/depositions?access_token=' . $token;

    try {
      $response = $this->httpClient->get($url, []);
      $response_data = json_decode($response->getBody()->getContents(), TRUE);
    }
    catch (RequestException $e) {
      $this->logger->error($e->getMessage());
    }
    return $response_data;
  }

  /**
   * Retrieve all records from Zenodo.
   *
   * @return array
   *   The records.
   */
  public function getAllRecords() {
    $records = [];
    $token = $this->config->get('token');

    try {
      $i = 1;
      do {
        $url = 'https://zenodo.org/api/records?access_token=' . $token . '&communities=parc&size=10&page=' . $i;
        $response = $this->httpClient->get($url);
        $response_data = json_decode($response->getBody()->getContents(), TRUE);
        $i++;
        if (!empty($response_data['hits']['hits'])) {
          $records[$i - 1] = $response_data;
        }
      } while (!empty($response_data['hits']['hits']));
    }
    catch (RequestException $e) {
      $this->logger->error($e->getMessage());
    }
    return $records;
  }

  /**
   * Process all the keywords from an array.
   *
   * @param array $keywords
   *   The keywords array.
   *
   * @return array
   *   An array of processed keywords.
   */
  public function processKeywords(array $keywords) {
    $final_keywords = [];
    foreach ($keywords as $keyword) {
      if (strpos($keyword, ',') !== FALSE) {
        $final_keywords = array_merge($final_keywords, explode(',', $keyword));
      }
      elseif (strpos($keyword, '·') !== FALSE) {
        $final_keywords = array_merge($final_keywords, explode(' · ', $keyword));
      }
      elseif (strpos($keyword, ';') !== FALSE) {
        $final_keywords = array_merge($final_keywords, explode(';', $keyword));
      }
      else {
        $final_keywords[] = $keyword;
      }
    }

    foreach ($final_keywords as &$final_keyword) {
      $final_keyword = trim($final_keyword);
      $final_keyword = ucfirst($final_keyword);
    }
    $final_keywords = array_unique($final_keywords);

    $keyword_terms = [];
    foreach ($final_keywords as $keyword) {
      $keyword = ucfirst($keyword);
      $keyword_terms[] = $this->getTermByName($keyword, 'publications');
    }
    return $keyword_terms;
  }

  /**
   * Retrieve a term by name, or create it if it doesn't exist.
   *
   * @param string $name
   *   The term name.
   * @param string $vid
   *   The vocabulary id.
   * @param bool $create
   *   If TRUE, create the term if it doesn't exist.
   *
   * @return \Drupal\taxonomy\TermInterface|null
   *   The term.
   */
  public function getTermByName(string $name, string $vid, bool $create = TRUE, $case_sensitive = FALSE) {
    /** @var \Drupal\taxonomy\TermStorageInterface $term_storage */
    $term_storage = $this->entityTypeManager->getStorage('taxonomy_term');

    $operator = !$case_sensitive ? '=' : 'LIKE BINARY';
    $terms = $term_storage->getQuery()
      ->accessCheck(FALSE)
      ->condition('vid', $vid)
      ->condition('name', $name, $operator)
      ->execute();
    /** @var \Drupal\taxonomy\TermInterface[] $term */
    $term = $term_storage->loadMultiple($terms);

    if (!empty($term)) {
      $term = reset($term);
      return $term;
    }

    if (!$create) {
      return NULL;
    }

    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = $term_storage->create([
      'name' => $name,
      'vid' => $vid,
    ]);
    $term->save();

    return $term;
  }

  /**
   * Create a publication from data.
   *
   * @param array $deposition
   *   The data.
   */
  public function createPublication(array $deposition) {
    $values = $this->getFieldValues($deposition);
    $values['type'] = 'publications';
    $node = Node::create($values);
    $node->body->format = 'full_html';
    $node->save();
  }

  /**
   * Get field values from an array of data.
   *
   * @param array $deposition
   *   The data.
   *
   * @return array
   *   The field values.
   */
  public function getFieldValues(array $deposition) {
    $creators = [];
    $keywords = [];
    if (isset($deposition['metadata']) && isset($deposition['metadata']['creators'])) {
      foreach ($deposition['metadata']['creators'] as $creator) {
        $creator_name = str_replace(', ', ' ', $creator['name']);
        $creators[] = ['value' => $creator_name];
      }
    }
    if (isset($deposition['metadata']) && isset($deposition['metadata']['keywords'])) {
      $keywords = $this->processKeywords($deposition['metadata']['keywords']);
    }
    $altered_publication_date = $deposition['metadata']['publication_date'] . 'T12:00:00';
    if (str_contains($deposition['metadata']['publication_date'], '.')) {
      $altered_publication_date = explode('.', $deposition['metadata']['publication_date'])[0];
    }
    $altered_modified_date = $deposition['updated'];
    if (str_contains($deposition['updated'], '.')) {
      $altered_modified_date = explode('.', $deposition['updated'])[0];
    }
    $values = [
      'title' => !empty($deposition['metadata']['title']) ? $deposition['metadata']['title'] : 'Untitled',
      'body' => [
        'format' => 'full_html',
        'value' => $deposition['metadata']['description'] ?? '',
      ],
      'field_authors' => $creators,
      'field_doi_link' => $deposition['links']['doi'] ?? '',
      'field_download_link' => $deposition['files'][0]['links']['self'] ?? '',
      'field_volume' => $deposition['metadata']['journal']['volume'] ?? '',
      'field_issue' => $deposition['metadata']['journal']['issue'] ?? '',
      'field_journal' => $deposition['metadata']['journal']['title'] ?? '',
      'field_pages' => $deposition['metadata']['journal']['pages'] ?? '',
      'field_key_words' => $keywords,
      'field_publication_date' => $deposition['metadata']['publication_date'] ? $altered_publication_date : date('Y-m-d\TH:i:s', time()),
      'created' => strtotime($deposition['metadata']['publication_date']),
      'field_updated_date' => $deposition['updated'] ? $altered_modified_date : date('Y-m-d\TH:i:s', time()),
      'changed' => $deposition['updated'] ? strtotime($altered_modified_date) : time(),
      'field_zenodo_id' => $deposition['id'] ?: '',
      'field_cover' => $this->getDefaultCoverImage(),
      'status' => 0,
    ];
    return $values;
  }

  /**
   * Check if a publication needs to be updated.
   *
   * @param string $modified_date
   *   The modified date.
   * @param \Drupal\node\NodeInterface $node
   *   The publication node.
   *
   * @return bool
   *   True if the publication needs to be updated.
   */
  public function checkPublicationUpdated(string $modified_date, NodeInterface $node) {
    if ($node->get('field_updated_date')->getValue()) {
      $node_updated = $node->get('field_updated_date')->getValue()[0]['value'];
      if (!str_contains($modified_date, $node_updated)) {
        return TRUE;
      }
    }
    return FALSE;
  }

  /**
   * Update a publication node.
   *
   * @param array $deposition
   *   The array of data.
   * @param \Drupal\node\NodeInterface $node
   *   The existing node.
   */
  public function updatePublication(array $deposition, NodeInterface $node) {
    $values = $this->getFieldValues($deposition);
    foreach ($values as $field_name => $value) {
      $node->set($field_name, $value);
    }
    $node->save();
  }

  /**
   * Get the default cover image.
   *
   * @return \Drupal\media\MediaInterface|null
   *   The default media entity.
   */
  protected function getDefaultCoverImage() {
    if (!empty($this->defaultCover)) {
      return $this->defaultCover;
    }

    $default_uuid = '096ec8be-f5d2-4021-96dc-ece0243bc80d';
    $media = $this->entityTypeManager->getStorage('media')->loadByProperties([
      'uuid' => $default_uuid,
    ]);
    if (empty($media)) {
      return NULL;
    }

    $media = reset($media);
    $this->defaultCover = $media;
    return $media;
  }

}
