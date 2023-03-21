<?php

namespace Drupal\parc_zenodo_api;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\RequestException;

/**
 *
 */
class ZendoApiHelper {
  /**
   * A http client.
   *
   * @var \GuzzleHttp\ClientInterface
   */
  protected $httpClient;

  /**
   * @param array $configuration
   * @param $plugin_id
   * @param $plugin_definition
   * @param \GuzzleHttp\ClientInterface $http_client
   */
  public function __construct(ClientInterface $http_client) {
    $this->httpClient = $http_client;
  }

  /**
   * Public static functions that GETS ALL Depositions.
   *
   * @return mixed
   */
  public function getAllDepositions() {
    $token = \Drupal::config('parc_zenodo_api.adminsettings')->get('token');
    $url = 'https://zenodo.org/api/deposit/depositions?access_token=' . $token;

    $client = $this->httpClient;

    try {
      $response = $client->get($url, []);
      $response_data = json_decode($response->getBody()->getContents(), TRUE);

      // Do something with data.
    }
    catch (RequestException $e) {
      // Log exception.
      \Drupal::logger('PARC Zenodo API')->error($e->getMessage());
    }
    return $response_data;
  }

  /**
   *
   */
  public function getAllRecords() {
    $records = [];
    $token = \Drupal::config('parc_zenodo_api.adminsettings')->get('token');
    $client = $this->httpClient;

    try {
      $i = 1;
      do {
        $url = 'https://zenodo.org/api/records?access_token=' . $token . '&communities=parc&size=10&page=' . $i;
        $response = $client->get($url);
        $response_data = json_decode($response->getBody()->getContents(), TRUE);
        $i++;
        if (!empty($response_data['hits']['hits'])) {
          $records[$i - 1] = $response_data;
        }
      } while (!empty($response_data['hits']['hits']));
    }
    catch (RequestException $e) {
      // Log exception.
      \Drupal::logger('PARC Zenodo API')->error($e->getMessage());
    }
  }

}
