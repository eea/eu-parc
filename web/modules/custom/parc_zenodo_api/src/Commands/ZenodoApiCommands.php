<?php

namespace Drupal\parc_zenodo_api\Commands;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\parc_zenodo_api\ZenodoApiHelper;
use Drush\Commands\DrushCommands;

/**
 * Drush commands for the Parc Zenodo API module.
 */
class ZenodoApiCommands extends DrushCommands {

  /**
   * The Zenodo API helper service.
   *
   * @var \Drupal\parc_zenodo_api\ZenodoApiHelper
   */
  protected $zenodoApiHelper;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Constructs a ZenodoApiCommands object.
   *
   * @param \Drupal\parc_zenodo_api\ZenodoApiHelper $zenodo_api_helper
   *   The Zenodo API helper service.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   */
  public function __construct(ZenodoApiHelper $zenodo_api_helper, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct();
    $this->zenodoApiHelper = $zenodo_api_helper;
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * Import publications from Zenodo.
   *
   * @param array $options
   *   An associative array of options.
   *
   * @option force
   *   Update all existing nodes regardless of their updated date.
   *fie
   * @command parc-zenodo:import
   * @aliases pz-import
   * @usage drush parc-zenodo:import
   *   Import all publications from Zenodo.
   * @usage drush parc-zenodo:import --force
   *   Re-import all publications, updating every node even if up-to-date.
   */
  public function import(array $options = ['force' => FALSE]) {
    $force = (bool) $options['force'];

    $this->output()->writeln('Fetching records from Zenodo...');
    $all_records = $this->zenodoApiHelper->getAllRecords();

    if (empty($all_records)) {
      $this->output()->writeln('No records found.');
      return;
    }

    $total = 0;
    $created = 0;
    $updated = 0;
    $skipped = 0;

    foreach ($all_records as $page) {
      foreach ($page['hits']['hits'] as $record) {
        $total++;
        $zenodo_id = $record['id'];

        $existing = $this->entityTypeManager->getStorage('node')->getQuery()
          ->accessCheck(FALSE)
          ->condition('type', 'publications')
          ->condition('field_zenodo_id', $zenodo_id)
          ->execute();

        if (empty($existing)) {
          $this->zenodoApiHelper->createPublication($record);
          $created++;
          $this->output()->writeln("Created: [{$zenodo_id}] " . ($record['metadata']['title'] ?? 'Untitled'));
        }
        else {
          $node = $this->entityTypeManager->getStorage('node')->load(reset($existing));
          if ($force || $this->zenodoApiHelper->checkPublicationUpdated($record['updated'], $node)) {
            $this->zenodoApiHelper->updatePublication($record, $node);
            $updated++;
            $this->output()->writeln("Updated: [{$zenodo_id}] " . ($record['metadata']['title'] ?? 'Untitled'));
          }
          else {
            $skipped++;
            $this->output()->writeln("Skipped (up-to-date): [{$zenodo_id}] " . ($record['metadata']['title'] ?? 'Untitled'));
          }
        }
      }
    }

    $this->output()->writeln('');
    $this->output()->writeln("Done. Total: {$total} | Created: {$created} | Updated: {$updated} | Skipped: {$skipped}");
  }

}
