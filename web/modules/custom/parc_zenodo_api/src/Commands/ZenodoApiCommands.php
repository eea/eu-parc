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

  /**
   * Backfill the PDF URL on publications that don't have one.
   *
   * Only sets field_pdf_url: no other field is modified, the changed time is
   * preserved, no PDF is downloaded and no node is created.
   *
   * @param array $options
   *   An associative array of options.
   *
   * @option dry-run
   *   Report what would change without saving anything.
   *
   * @command parc-zenodo:backfill-pdf-url
   * @aliases pz-backfill-pdf-url
   * @usage drush parc-zenodo:backfill-pdf-url --dry-run
   *   Show which publications would get a PDF URL.
   * @usage drush parc-zenodo:backfill-pdf-url
   *   Set the PDF URL on all publications that don't have one.
   */
  public function backfillPdfUrl(array $options = ['dry-run' => FALSE]) {
    $dry_run = $options['dry-run'];

    $node_storage = $this->entityTypeManager->getStorage('node');
    $nids = $node_storage->getQuery()
      ->accessCheck(FALSE)
      ->condition('type', 'publications')
      ->notExists('field_pdf_url.uri')
      ->execute();

    $updated = 0;
    $no_id = 0;
    $no_pdf = 0;
    $not_retrieved = 0;

    foreach ($nids as $nid) {
      /** @var \Drupal\node\NodeInterface $node */
      $node = $node_storage->load($nid);
      $zenodo_id = $node->get('field_zenodo_id')->value ?? '';

      // Some IDs are stored as a record URL or DOI, which end in the record ID.
      if (!preg_match('#(\d+)/?$#', $zenodo_id, $matches)) {
        $no_id++;
        $this->output()->writeln("No Zenodo ID: node {$nid} [{$zenodo_id}] " . $node->label());
        continue;
      }

      $record = $this->zenodoApiHelper->getRecord($matches[1]);
      if ($record === NULL) {
        $not_retrieved++;
        $this->output()->writeln("Could not retrieve: node {$nid} [{$zenodo_id}] " . $node->label());
        continue;
      }

      $pdf_url = $this->zenodoApiHelper->getPdfUrl($matches[1], $record['files'][0]['key'] ?? '');
      if (!$pdf_url) {
        $no_pdf++;
        $this->output()->writeln("No PDF: node {$nid} [{$zenodo_id}] " . $node->label());
        continue;
      }

      $updated++;
      $this->output()->writeln(($dry_run ? 'Would update' : 'Updated') . ": node {$nid} {$pdf_url}");

      if (!$dry_run) {
        $node->set('field_pdf_url', $pdf_url);
        $node->setSyncing(TRUE);
        $node->save();
      }
    }

    $this->output()->writeln('');
    $this->output()->writeln(($dry_run ? '[Dry run] ' : '') . 'Done. Without URL: ' . count($nids) . " | Updated: {$updated} | No PDF: {$no_pdf} | No Zenodo ID: {$no_id} | Could not retrieve: {$not_retrieved}");
  }

}
