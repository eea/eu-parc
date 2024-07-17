<?php

namespace Drupal\parc_core\Form;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Term;

class ImportCsvForm extends FormBase
{

    protected EntityTypeManagerInterface $entityTypeManager;
    public function __construct(EntityTypeManagerInterface $entity_type_manager)
    {
        $this->entityTypeManager = $entity_type_manager;
    }

    public static function create(ContainerInterface $container)
    {
        return new static(
            $container->get('entity_type.manager')
        );
    }
    public function getFormId()
    {
        return 'parc_core_import_csv_form';
    }
    public function buildForm(array $form, FormStateInterface $form_state)
    {
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

    public function submitFormImport(array &$form, FormStateInterface $form_state)
    {
        $validators = [
        'file_validate_extensions' => ['csv'],
        ];

        if ($file = file_save_upload('csv_file', $validators, false, 0)) {
            // If we have a valid upload.
            $file->setPermanent();
            $file->save();

            $file_uri = $file->getFileUri();
            $file_path = \Drupal::service('file_system')->realpath($file_uri);

            if (($handle = fopen($file_path, 'r')) !== false) {
                $row_index = 0;
                while (($data = fgetcsv($handle, 1500, ",")) !== false) {
                    if ($row_index > 0) {
                        $this->processCsvRow($data);
                    }
                    $row_index++;
                }
                fclose($handle);
            }
        } else {
            \Drupal::messenger()->addError($this->t('The file could not be uploaded.'));
        }
    }

    /**
     * Process a row from the CSV file.
     *
     * @param array $data
     *   The row data from the CSV file.
     */
    protected function processCsvRow(array $data)
    {
        // Raw data
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

        // Processed data
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
        'field_project_contacts' => $this->processContactsNameToId($contacts),
        ];

        $this->createProjectNode($node_data);
    }

    /**
     * Create and save a project node.
     *
     * @param array $node_data
     *   An associative array containing the node field values.
     */
    protected function createProjectNode(array $node_data)
    {
        $storage = $this->entityTypeManager->getStorage('node');
        $node = $storage->create(['type' => $node_data['type'], 'title' => $node_data['title']]);


        foreach ($node_data as $field_name => $value) {
            if ($field_name === 'type' || $field_name === 'title') {
                continue;
            }

            if($field_name === 'field_date_range') {

                $node->set('field_date_range', $value);
                continue;
            }

            if($field_name === 'field_project_contacts') {
                $contacts = [];
                foreach ($value as $contact) {


                    $nod = \Drupal::entityTypeManager()->getStorage('paragraph')->load($contact);

                    if($nod) {
                        $rev_id = $nod->getRevisionId();

                        $contacts[] = ['target_id' => $contact, 'target_revision_id' => $rev_id];

                    }

                }
                $node->set('field_project_contacts', $contacts);
                continue;
            }


            if (is_array($value)) {
                $this->set_node_field_values($node, $field_name, $value);
            } else {
                $this->set_node_single_value($node, $field_name, $value);
            }
        }

        $node->save();
    }




    public function submitFormExport(array &$form, FormStateInterface $form_state)
    {
        $this->messenger()->addMessage($this->t('Export process started.'));

        $projects = $this->getAllProjects();



        $csv_data = [];

        $header = [];
        $first_publication = reset($projects);
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

        $this->createCSV($csv_data);

    }

    public function createCSV($csv_data)
    {
        $csv_content = '';
        foreach ($csv_data as $line) {
            $line = array_map(
                function ($value) {
                    return '"' . str_replace('"', '""', $value) . '"';
                }, $line
            );
            $csv_content .= implode(',', $line) . "\n";
        }

        // Set headers for file download.
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


    public function getTermNameById($term_id)
    {
        $term = Term::load($term_id);

        if ($term) {
            $term_name = $term->getName();
            return $term_name;
        } else {
            return null;
        }
    }

    public function processProjectContacts($project)
    {
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
    public function processProjectTerms($project, $type)
    {
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

    public function processProjectPotentialImpacts($project)
    {
        $potential_impacts = $project->get('field_project_potential_impacts')->getValue();
        $final_string = '';
        foreach ($potential_impacts as $potential_impact) {
            $final_string .= '\n' . $potential_impact;
        }

        return $final_string;
    }

    public function processProjectContent($project, $field, $type)
    {
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

    public function getIdByName($name, $type, $content_type)
    {
        $identifier_field ='';
        $type_field = '';
        if($content_type == 'node') {
            $identifier_field = 'title';
            $type_field = 'type';
        }
        if($content_type == 'taxonomy_term') {
            $identifier_field = 'name';
            $type_field = 'vid';
        }

        $query = \Drupal::entityQuery($content_type)
            ->condition($identifier_field, $name)
            ->condition($type_field, $type)
            ->accessCheck(false)
            ->execute();

        if (!empty($query)) {
            return reset($query);
        }
        return null;

    }



    public function getParagraphIdByNameAndEmail($name, $email)
    {
        $query = \Drupal::entityQuery('paragraph')
            ->condition('type', 'contact')
            ->condition('field_name', $name)
            ->condition('field_email', $email)
            ->accessCheck(false)
            ->execute();
        if (!empty($query)) {
            return reset($query);
        }
        return null;
    }

    protected function set_node_field_values(Node $node, $field_name, array $values, $value_key = 'target_id')
    {
        $field_values = [];
        foreach ($values as $value) {
            $field_values[] = [$value_key => $value];
        }


        if (!empty($field_values)) {
            $node->set($field_name, $field_values);
        }
    }


    private function set_node_single_value(Node $node, $field_name, $value)
    {
        if (!empty($value)) {
            $node->set($field_name, $value);
        }
    }

    public function processContactsNameToId($paragraph)
    {
        if (empty($paragraph)) {
            return [];
        }
        $paragraph_array = explode("\n", $paragraph);
        $paragraphs = [];
        foreach ($paragraph_array as &$paragraph) {
            $paragraph = explode("|", $paragraph);

            $name = $paragraph[0];
            $email = $paragraph[1];

            $paragraphs[] = $this->getParagraphIdByNameAndEmail($name, $email);
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
    public function processEntitiesNameToId($entities, $type, $content_type)
    {
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
