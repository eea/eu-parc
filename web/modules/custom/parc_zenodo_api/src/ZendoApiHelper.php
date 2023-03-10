<?php

  /**
   * @file
   * Contains Drupal\parc_zenodo_api\ZenodoApiHelper.
   */

  namespace Drupal\parc_zenodo_api;

  use Drupal\Component\DependencyInjection\ContainerInterface;
  use GuzzleHttp\ClientInterface;
  use GuzzleHttp\Exception\RequestException;

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
     * @return mixed
     */
    public function getAllDepositions() {
      $token = \Drupal::config('parc_zenodo_api.adminsettings')->get('token');
      $url = 'https://zenodo.org/api/deposit/depositions?access_token=' . $token;

      $client = $this->httpClient;

      try {
        $response = $client->get($url, []);
        $response_data = json_decode($response->getBody()->getContents(), TRUE);

        // do something with data
      }
      catch (RequestException $e) {
        // log exception
        \Drupal::logger('PARC Zenodo API')->error($e->getMessage());
      }
      return $response_data;
    }
  }
