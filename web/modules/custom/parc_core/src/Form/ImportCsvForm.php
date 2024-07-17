<?php

namespace Drupal\parc_core\Form;

use Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException;
use Drupal\Component\Plugin\Exception\PluginNotFoundException;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\node\Entity\Node;
use Drupal\paragraphs\Entity\Paragraph;
use Drupal\taxonomy\Entity\Term;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * Class ImportCsvForm.
 *
 * Defines a form for importing and exporting projects via CSV.
 */
class ImportCsvForm extends FormBase {
  /**
   * The entity type manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected EntityTypeManagerInterface $entityTypeManager;

  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): ImportCsvForm|static {
    return new static(
          $container->get('entity_type.manager')
      );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'parc_core_import_csv_form';
  }

  /**
   * Builds the form.
   *
   * @param array $form
   *   An associative array containing the structure of the form.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The current state of the form.
   *
   * @return array
   *   The form structure.
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $form['csv_file'] = [
      '#type' => 'file',
      '#title' => $this->t('CSV file'),
      '#description' => $this->t('Upload a CSV file to import data.'),
    ];
    $form['actions']['import'] = [
      '#type' => 'submit',
      '#value' => 'Import',
      '#submit' => ["::submitFormImport"],
    ];
    $form['actions']['export'] = [
      '#type' => 'submit',
      '#value' => 'Export',
      '#submit' => ["::submitFormExport"],
    ];
    $form['#attributes']['enctype'] = 'multipart/form-data';

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state): void {
    $validators = [
      'file_validate_extensions' => ['csv'],
    ];

    if (!$file = file_save_upload('csv_file', $validators, FALSE, 0)) {
      $form_state->setErrorByName('csv_file', $this->t('The file could not be uploaded.'));
    }
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    // We don't use this, this is only for inheritance.
  }

  /**
   * Handles the import process of the CSV file.
   *
   * @param array &$form
   *   An associative array containing the structure of the form.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The current state of the form.
   *
   * @throws \Drupal\Core\Entity\EntityStorageException
   */
  public function submitFormImport(array &$form, FormStateInterface $form_state): void {
    $validator = [
      'file_validate_extensions' => ['csv'],
    ];
    if ($file = file_save_upload('csv_file', $validator, FALSE, 0)) {

      $file->save();

      $file_uri = $file->getFileUri();
      $file_path = \Drupal::service('file_system')->realpath($file_uri);

      if (($handle = fopen($file_path, 'r')) !== FALSE) {
        $row_index = 0;
        while (($data = fgetcsv($handle, NULL, ",")) !== FALSE) {
          if ($row_index > 0) {
            $this->processCsvRow($data);
          }
          $row_index++;
        }
        fclose($handle);
      }
    }
    else {
      \Drupal::messenger()->addError($this->t('The file could not be uploaded.'));
    }
  }

  /**
   * Process a row from the CSV file.
   *
   * @param array $data
   *   The row data from the CSV file.
   */
  protected function processCsvRow(array $data): void {
    $title = $data[0];
    $body = $data[1];
    $related_publications = $data[2];
    $topics = $data[3];
    $keywords = $data[4];
    $internal_title = $data[5];
    $start_date = $data[6];
    $end_date = $data[7];
    $potential_impacts = $data[8];
    $partners = $data[9];
    $contacts = $data[10];

    $node_data = [
      'type' => 'project',
      'title' => $title,
      'body' => $body,
      'field_project_abbreviation' => $internal_title,
      'field_date_range' => ['value' => $start_date, 'end_value' => $end_date],
      'field_related_publications' => $this->processEntitiesNameToId($related_publications, 'publications', 'node'),
      'field_project_topics' => $this->processEntitiesNameToId($topics, 'project_topics', 'taxonomy_term'),
      'field_project_keywords' => $this->processEntitiesNameToId($keywords, 'project_keywords', 'taxonomy_term'),
      'field_project_potential_impacts' => explode("\n", $potential_impacts),
      'field_partners' => $this->processEntitiesNameToId($partners, 'institution', 'node'),
      // Creez altul, nu caut.
      'field_project_contacts' => $this->processContactsNameToId($contacts),
    ];

    $this->createProjectNode($node_data);
  }

  /**
   * Create and save a project node.
   *
   * @param array $node_data
   *   An associative array containing the node field values.
   *
   * @throws \Drupal\Core\Entity\EntityStorageException
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  protected function createProjectNode(array $node_data): void {
    $storage = $this->entityTypeManager->getStorage('node');
    $node = $storage->create(['type' => $node_data['type'], 'title' => $node_data['title']]);

    foreach ($node_data as $field_name => $value) {
      if ($field_name === 'type' || $field_name === 'title') {
        continue;
      }

      if ($field_name === 'field_date_range') {

        $node->set('field_date_range', $value);
        continue;
      }

      // Le fac o singura functie.
      if (!is_array($value)) {
        $value = [$value];
      }
      $this->setNodeFieldValues($node, $field_name, $value);

    }

    $node->save();
  }

  /**
   * Submit handler for the import button.
   *
   * @param array &$form
   *   The form structure.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The form state.
   */
  public function submitFormExport(array &$form, FormStateInterface $form_state): void {
    $this->messenger()->addMessage($this->t('Export process started.'));

    $projects = $this->getAllProjects();

    $csv_data = [];

    $header = ['title',
      'body',
      'related_publications',
      'topics',
      'keywords',
      'internal_title',
      'start_date',
      'end_date',
      'potential_impacts',
      'partners',
      'contacts',
    ];
    $csv_data[] = $header;

    foreach ($projects as $project) {

      $data_array =
        [
          'title' => $project->get('title')->value,
          'body' => $project->get('body')->value,
          'related_publications' => $this->processProjectContent($project, 'field_related_publications'),
          'topics' => $this->processProjectContent($project, 'field_project_topics'),
          'keywords' => $this->processProjectContent($project, 'field_project_keywords'),
          'internal_title' => $project->get('field_project_abbreviation')->value,
          'start_date' => $project->get('field_date_range')->value,
          'end_date' => $project->get('field_date_range')->end_value,
          'potential_impacts' => $this->processProjectPotentialImpacts($project),
          'partners' => $this->processProjectContent($project, 'field_partners'),
          'contacts' => $this->processProjectContacts($project),
        ];
      // Le fac array.
      $row = [
        $data_array['title'],
        $data_array['body'],
        $data_array['related_publications'],
        $data_array['topics'],
        $data_array['keywords'],
        $data_array['internal_title'],
        $data_array['start_date'],
        $data_array['end_date'],
        $data_array['potential_impacts'],
        $data_array['partners'],
        $data_array['contacts'],
      ];

      $csv_data[] = $row;
    }
    echo "yes";
    $this->createCsv($csv_data);

  }

  /**
   * Process a row from the CSV file.
   *
   * @param array $csv_data
   *   The row data from the CSV file.
   */
  protected function createCsv(array $csv_data): void {
    $csv_content = '';
    foreach ($csv_data as $line) {
      $line = array_map(
            function ($value) {
                return '"' . str_replace('"', '""', $value) . '"';
            }, $line
        );
      $csv_content .= implode(',', $line) . "\n";
    }

    $response = new Response($csv_content);
    $disposition = $response->headers->makeDisposition(
          ResponseHeaderBag::DISPOSITION_ATTACHMENT,
          'projects.csv'
      );
    $response->headers->set('Content-Disposition', $disposition);
    $response->headers->set('Content-Type', 'text/csv');
    $response->headers->set('Pragma', 'public');
    $response->headers->set('Expires', '0');
    $response->headers->set('Cache-Control', 'must-revalidate, post-check=0, pre-check=0');
    $response->headers->set('Content-Transfer-Encoding', 'binary');
    $response->headers->set('Content-Length', strlen($csv_content));

    $response->send();
  }

  /**
   * Functions used for exporting the CSV.
   */
  protected function getAllProjects(): array {
    $storage = NULL;
    try {
      $storage = $this->entityTypeManager->getStorage('node');
    }
    catch (InvalidPluginDefinitionException | PluginNotFoundException $e) {
      $err = $e->getMessage();
      \Drupal::messenger()->addError($err);

    }
    $query = $storage->getQuery()
      ->condition('type', 'project')
      ->accessCheck(FALSE);

    $ids = $query->execute();
    return $storage->loadMultiple($ids);
  }

  /**
   * Get the name of a taxonomy term by its ID.
   *
   * @param int $term_id
   *   The term ID.
   *
   * @return string|null
   *   The term name or NULL if not found.
   */
  protected function getTermNameById(int $term_id): ?string {
    $term = Term::load($term_id);

    return $term?->getName();
  }

  /**
   * Process project contacts into a string format.
   *
   * @param \Drupal\node\Entity\Node $project
   *   The project node.
   *
   * @return string
   *   A string of project contacts.
   */
  protected function processProjectContacts(Node $project): string {

    $final_string = '';

    $field_name = 'field_project_contacts';

    if ($project->hasField($field_name)) {
      $field_items = $project->get($field_name);
      $contacts = [];

      foreach ($field_items as $item) {
        $referenced_entity = $item->entity;

        $name = $referenced_entity->get('field_name')->value;
        $email = $referenced_entity->get('field_email')->value;

        $contacts[] = $name . "|" . $email;
      }
      $final_string = implode("\n", $contacts);
    }

    return $final_string;
  }

  /**
   * Process project potential impacts into a string format.
   *
   * @param \Drupal\node\Entity\Node $project
   *   The project node.
   *
   * @return string
   *   A string of project potential impacts.
   */
  protected function processProjectPotentialImpacts(Node $project): string {
    $potential_impacts = array_column($project->get('field_project_potential_impacts')->getValue(), 'value');
    return implode("\n", $potential_impacts);
  }

  /**
   * Process project field content into a string format.
   *
   * @param \Drupal\node\Entity\Node $project
   *   The project node.
   * @param string $field
   *   The field name.
   *
   * @return string
   *   A string of field content.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  protected function processProjectContent(Node $project, string $field): string {
    $final_string = '';

    if ($project->hasField($field)) {
      $field_items = $project->get($field);
      $titles = [];
      foreach ($field_items as $item) {
        $referenced_entity = $item->entity;
        if ($referenced_entity) {
          $titles[] = $referenced_entity->label();
        }
      }
      $final_string = implode("\n", $titles);
    }

    return $final_string;
  }

  /**
   * Functions for importing the CSV.
   */
  protected function getIdByName($name, $type, $content_type) {
    $identifier_field = $content_type == 'node' ? 'title' : 'name';
    $type_field = $content_type == 'node' ? 'type' : 'vid';
    echo $content_type;


    $query = \Drupal::entityQuery($content_type)
      ->condition($identifier_field, $name)
      ->condition($type_field, $type)
      ->accessCheck(FALSE)
      ->execute();

    if (!empty($query)) {
      return reset($query);
    }
    return NULL;

  }

  /**
   * Creates a paragraph of type contact with the given name and email.
   *
   * @param string $name
   *   The name for the contact paragraph.
   * @param string $email
   *   The email for the contact paragraph.
   *
   * @return array|null
   *   An associative array containing the 'id' and 'revision_id' of the
   *   created paragraph, or NULL on failure.
   *
   * @throws \Drupal\Core\Entity\EntityStorageException
   */
  protected function createParagraph(string $name, string $email): ?array {
    $paragraph = Paragraph::create([
      'type' => 'contact',
      'field_name' => $name,
      'field_email' => $email,
    ]);

    $paragraph->save();

    return [
      'target_id' => $paragraph->id(),
      'target_revision_id' => $paragraph->getRevisionId(),
    ];
  }

  /**
   * Set node field values.
   */
  protected function setNodeFieldValues(Node $node, $field_name, array $values, $value_key = 'target_id'): void {
    $field_values = [];
    if ($field_name === 'field_project_contacts') {
      $field_values = $values;

    }
    else {

      foreach ($values as $value) {
        $field_values[] = [$value_key => $value];
      }
    }

    if (!empty($field_values)) {
      $node->set($field_name, $field_values);
    }
  }

  /**
   * Process paragraphs to their IDs.
   *
   * @param string $paragraph
   *   A string containing the paragraph names separated by new lines.
   *
   * @return array
   *   An array of paragraph ids.
   *
   * @throws \Drupal\Core\Entity\EntityStorageException
   */
  protected function processContactsNameToId(string $paragraph): array {
    if (empty($paragraph)) {
      return [];
    }
    $paragraph_array = explode("\n", $paragraph);
    $paragraphs = [];
    foreach ($paragraph_array as &$paragraph) {
      $paragraph = explode("|", $paragraph);

      $name = $paragraph[0];
      $email = $paragraph[1];

      $paragraphs[] = $this->createParagraph($name, $email);
    }

    return $paragraphs;

  }

  /**
   * Process a list of entity names to their IDs.
   *
   * @param string $entities
   *   A string containing entity names separated by new lines.
   * @param string $type
   *   The type of the entity (content type for nodes, vocabulary for terms).
   * @param string $content_type
   *   The type of entity to query ('node' or 'term').
   *
   * @return array
   *   An array of entity IDs.
   */
  protected function processEntitiesNameToId(string $entities, string $type, string $content_type): array {
    if (empty($entities)) {
      return [];
    }

    $entity_array = explode("\n", $entities);
    foreach ($entity_array as &$entity) {
      $entity = $this->getIdByName(trim($entity), $type, $content_type);
    }

    return $entity_array;
  }

}
