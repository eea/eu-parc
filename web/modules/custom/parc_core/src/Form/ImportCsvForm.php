<?php

namespace Drupal\parc_core\Form;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Drupal\taxonomy\Entity\Term;


class ImportCsvForm extends FormBase {

  protected EntityTypeManagerInterface $entityTypeManager;
  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
  }

  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager')
    );
  }
  public function getFormId() {
    return 'parc_core_import_csv_form';
  }
  public function buildForm(array $form, FormStateInterface $form_state) {
    $form['csv_file'] = array(
      '#type' => 'file',
      '#title' => $this->t('CSV file'),
      '#description' => $this->t('Upload a CSV file to import data.'),
    );
    $form['actions']['import'] = array(
      '#type' => 'submit',
      '#value' => 'Import',
      '#submit' =>["::submitFormImport"]
    );
    $form['actions']['export'] = array(
      '#type' => 'submit',
      '#value' => 'Export',
      '#submit' =>["::submitFormExport"]
    );
    $form['#attributes']['enctype'] = 'multipart/form-data';

    return $form;
  }

  public function submitForm(array &$form, FormStateInterface $form_state)
  {
    // We don't use this, this is only for inheritance.
  }

  public function submitFormImport(array &$form, FormStateInterface $form_state) {
    $validators = array(
      'file_validate_extensions' => array('csv'),
    );

    // Handle file upload.
    if ($file = file_save_upload('csv_file', $validators, FALSE, 0)) {
      // If we have a valid upload.
      $file->setPermanent();
      $file->save();

      // Read the CSV file.
      $file_uri = $file->getFileUri();
      $file_path = \Drupal::service('file_system')->realpath($file_uri);

      // Open the CSV file and read data.
      if (($handle = fopen($file_path, 'r')) !== FALSE) {
        $i=0;
        while (($data = fgetcsv($handle, 1500, ",")) !== FALSE) {
          if($i!=0){
            //raw data
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
            // processed data
            $date_range = array('value' => $start_date, 'end_value' => $end_date);
            $topics = $this->processTermsNameToId($topics, 'project_topics');
            $keywords = $this->processTermsNameToId($keywords, 'project_keywords');
            $related_publications = $this->processNodesNameToId($related_publications, 'publications');
            $partners = $this->processNodesNameToId($partners, 'institution');
            $contacts = $this->processContactsNameToId($contacts);

            $storage = $node = $this->entityTypeManager->getStorage('node');
            $node = $storage->create([
              'type' => 'project',
              'title' => $title,
              'body' => [
                'value' => $body,
                'format' => 'full_html', // Adjust the text format as needed.
              ],
              'field_internal_title' => $internal_title,
              'field_date_range' => $date_range,
              'field_project_topics' => $topics,
              'field_project_keywords' => $keywords,
              'field_related_publications' => $related_publications,
              'field_project_potential_impacts' => [
                'value' => $potential_impacts,
              ],
              'field_partners' => $partners,
              'field_project_contacts' => $contacts,]);

            // Save the entity.
            $node->save();

          }

          $i+=1;

        }
        fclose($handle);
      }
    } else {
      \Drupal::messenger()->addError($this->t('The file could not be uploaded.'));
    }
  }

  public function processContactsNameToId($paragraph){
    $paragraph_array = explode("\n", $paragraph);
    $paragraphs = [];
    foreach($paragraph_array as &$paragraph){
      $paragraph = explode("|", $paragraph);
      $name = $paragraph[0];
      $email = $paragraph[1];

      $paragraphs[] = $this->getParagraphIdByNameAndEmail($name, $email);
    }

    return $paragraphs;


  }
  public function processTermsNameToId($terms, $type){
    $term_array = explode("\n", $terms);
    foreach($term_array as &$term){
      $term = $this->getTermIdByName(trim($term), $type);
    }

    return $term_array;
  }

  public function processNodesNameToId($nodes, $type){
    $nodes_array = explode("\n", $nodes);
    foreach($nodes_array as &$node){
      $node = $this->getNodeIdByTitle(trim($node), $type);
    }

    return $nodes_array;
  }


  public function submitFormExport(array &$form, FormStateInterface $form_state) {
    $this->messenger()->addMessage($this->t('Export process started.'));

    $projects = $this->getAllProjects();



    $csv_data = [];

    $header = [];
    $first_publication = reset($projects); // Get the first publication for headers
    $header = array('title','body','related_publications','topics','keywords','internal_title','start_date','end_date','potential_impacts','partners', 'contacts');
    $csv_data[] = $header;

    foreach ($projects as $project) {
      $keywords = $this->processProjectTerms($project, 'keywords');
      $title = $project->get('title')->value;
      $body = $project->get('body')->value;
      $related_publications = $this->processProjectContent($project, 'related_publications', 'publications');
      $topics = $this->processProjectTerms($project, 'topics');
      $date_range = $project->get('field_date_range')->getValue();
      $start_date = $date_range[0]['value'];
      $end_date = $date_range[0]['end_value'];
      $potential_impacts = $this->processProjectPotentialImpacts($project);
      $partners = $this->processProjectContent($project, 'partners', 'institution');
      $contacts = $this->processProjectContacts($project);


      $row = [
        $title ?? '',
        $body ?? '',
        $related_publications ?? '',
        $topics ?? '',
        $keywords ?? '',
        $topics ?? '',
        $start_date ?? '',
        $end_date ?? '',
        $potential_impacts ?? '',
        $partners ?? '',
        $contacts ?? ''
      ];

      $csv_data[] = $row;
    }

    $csv_content = '';
    foreach ($csv_data as $line) {
      $line = array_map(function($value) {
        return '"' . str_replace('"', '""', $value) . '"';
      }, $line);
      $csv_content .= implode(',', $line) . "\n";
    }

    // Set headers for file download
    $response = new Response($csv_content);
    $disposition = $response->headers->makeDisposition(
      ResponseHeaderBag::DISPOSITION_ATTACHMENT,
      'publications.csv'
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
  ///////////// Functions used for exporting the CSV

  public function getAllProjects()
  {
    $storage = $this->entityTypeManager->getStorage('node');
    $query = $storage->getQuery()
      ->condition('type', 'project')
      ->accessCheck(false);

    $ids = $query->execute();
    $projects = $storage->loadMultiple($ids);

    return $projects;
  }


  public function getTermNameById($term_id) {
    $term = Term::load($term_id);

    if ($term) {
      $term_name = $term->getName();
      return $term_name;
    } else {
      return NULL;
    }
  }

  public function processProjectContacts($project){
    $string = '';

    $storage = $this->entityTypeManager->getStorage('paragraph');
    $final_string = '';

    if ($project && $project->getType() == 'project') {
      $field_name = 'field_project_contacts';

      if ($project->hasField($field_name)) {
        $field_items = $project->get($field_name);
        $contacts = [];

        foreach ($field_items as $item) {
          $referenced_entity = $item->entity;
          $name = $referenced_entity->get('field_name')->value;
          $email = $referenced_entity->get('field_email')->value;

          $contacts[] = $name ."|".$email;
        }
        $final_string = implode("\n", $contacts);
      }
    }
    return $final_string;
  }
  public function processProjectTerms($project, $type) {
    $keyword_string = '';


    if ($project && $project->getType() == 'project') {
      $keywords = $project->get('field_project_' . $type)->getValue();

      foreach ($keywords as $keyword) {
        $name = $this->getTermNameById($keyword['target_id']);

        if ($name) {
          $keyword_string .= $name . "\n";
        }
      }

      $keyword_string = rtrim($keyword_string, "\n");
    } else {
      $keyword_string = 'Project not found or is not a project type.';
    }

    return $keyword_string;
  }

  public function processProjectPotentialImpacts($project){
    $potential_impacts = $project->get('field_project_potential_impacts')->getValue();
    $final_string = '';
    foreach ($potential_impacts as $potential_impact) {
      $final_string .= '\n' . $potential_impact;
    }

    return $final_string;
  }

  public function processProjectContent($project, $field, $type) {
    $storage = $this->entityTypeManager->getStorage('node');
    $final_string = '';

    if ($project && $project->getType() == 'project') {
      $field_name = 'field_' . $field;

      if ($project->hasField($field_name)) {
        $field_items = $project->get($field_name);
        $titles = [];
        foreach ($field_items as $item) {
          $referenced_entity = $item->entity;
          if ($referenced_entity && $referenced_entity->getType() == $type) {
            $titles[] = $referenced_entity->getTitle();
          }
        }
        $final_string = implode("\n", $titles);
      }
    }
    return $final_string;
  }

  ///////////// Functions for importing the CSV


  public function getTermIdByName($term_name, $vocabulary) {
    $query = \Drupal::entityQuery('taxonomy_term')
      ->condition('name', $term_name)
      ->condition('vid', $vocabulary)
      ->accessCheck(false)
      ->execute();
    if (!empty($query)) {
      return reset($query); // Return the first matching term ID.
    }
    return NULL;
  }

  public function getNodeIdByTitle($title, $type) {
    $query = \Drupal::entityQuery('node')
      ->condition('title', $title)
      ->condition('type', $type)
      ->accessCheck(false)
      ->execute();
    if (!empty($query)) {
      return reset($query); // Return the first matching node ID.
    }
    return NULL;
  }

  public function getParagraphIdByNameAndEmail($name, $email) {
    $query = \Drupal::entityQuery('paragraph')
      ->condition('type', 'contact')
      ->condition('field_name', $name)
      ->condition('field_email', $email)
      ->accessCheck(false)
      ->execute();
    if (!empty($query)) {
      return reset($query);
    }
    return NULL;
  }

}
