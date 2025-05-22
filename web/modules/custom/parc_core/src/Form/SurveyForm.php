<?php

namespace Drupal\parc_core\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Render\Markup;
use Drupal\votingapi\Entity\Vote;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * The survey form.
 */
class SurveyForm extends FormBase {

  /**
   * The current node/term.
   *
   * @var \Drupal\node\NodeInterface|\Drupal\taxonomy\TermInterface
   */
  protected $entity;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'eu_parc_survey_form';
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    $instance = parent::create($container);
    $instance->entityTypeManager = $container->get('entity_type.manager');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state, $entity = NULL) {
    $this->entity = $entity;

    $entity_id = $entity->id();
    $survey_paragraph = $entity->get('field_survey')->first()?->entity;
    if (!$survey_paragraph) {
      return $form;
    }

    $question = $survey_paragraph->get('field_question')->value;
    $options = $survey_paragraph->get('field_options')->getValue();
    $options = array_column($options, 'value');

    $voteStorage = $this->entityTypeManager
      ->getStorage('vote');

    $hasVoted = $voteStorage
      ->getQuery()
      ->condition('entity_type', $entity->getEntityTypeId())
      ->condition('entity_id', $entity_id)
      ->condition('vote_source', Vote::getCurrentIp())
      ->count()
      ->accessCheck(FALSE)
      ->execute();

    $numberOfVotes = $voteStorage
      ->getQuery()
      ->condition('entity_type', $entity->getEntityTypeId())
      ->condition('entity_id', $entity_id)
      ->count()
      ->accessCheck(FALSE)
      ->execute();

    $form['question'] = [
      '#type' => 'inline_template',
      '#template' => '<p>{{ "Contribute to our survey" | t }}</p><h3 class="survey-title">{{ question }}</h3><p>{{ "Number of answers:" | t }} {{ number }}</p>',
      '#context' => [
        'question' => $question,
        'number' => $numberOfVotes,
      ],
    ];

    if ($hasVoted) {
      return $this->buildResults($form, $options, $entity_id);
    }

    $form['options'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['survey-options']],
    ];

    foreach ($options as $index => $label) {
      $form['options'][$index] = [
        '#type' => 'submit',
        '#value' => $label,
        '#name' => 'vote_' . $index,
        '#attributes' => [
          'class' => ['survey-option-link'],
        ],
        '#ajax' => [
          'callback' => '::ajaxSubmit',
          'wrapper' => 'survey-form-wrapper',
          'progress' => [
            'type' => 'none',
          ]
        ],
        '#submit' => ['::ajaxVoteSubmit'],
        '#prefix' => '<div class="survey-option">',
        '#suffix' => '</div>',
      ];
    }

    if (count($options) % 2 == 1) {
      $form['options'][$index + 1] = [
        '#markup' => '<div class="survey-option"></div>',
      ];
    }

    $form['#attributes']['class'][] = 'container';
    $form['#attributes']['class'][] = 'survey-container';

    $color = $survey_paragraph->get('field_background_color')->color;
    $color_class = '';
    if ($color) {
      $color_class = 'override-color';
    }
    $form['#prefix'] = Markup::create("<div class=\"survey-form-wrapper $color_class\" style=\"--survey-color: $color;\" id=\"survey-form-wrapper\">");
    $form['#suffix'] = '</div>';
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function ajaxSubmit(array &$form, FormStateInterface $form_state) {
    if ($form_state->get('voted')) {
      $options = $this->entity->get('field_survey')->first()?->entity->get('field_options')->getValue();
      $options = array_column($options, 'value');
      return $this->buildResults($form, $options, $this->entity->id());
    }

    return $form;
  }

  /**
   * Ajax form submit.
   *
   * @param array $form
   *   The form.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The form state.
   */
  public function ajaxVoteSubmit(array &$form, FormStateInterface $form_state) {
    $triggering_element = $form_state->getTriggeringElement();
    $clicked_button_name = $triggering_element['#name'];
    $option_index = str_replace('vote_', '', $clicked_button_name);

    $nid = $this->entity->id();

    $vote = $this->entityTypeManager->getStorage('vote')->create([
      'entity_type' => $this->entity->getEntityTypeId(),
      'entity_id' => $nid,
      'value_type' => 'percent',
      'value' => $option_index,
      'tag' => 'parc_core',
      'type' => 'vote',
    ]);
    $vote->save();

    $form_state->set('voted', TRUE);
    $form_state->set('option_index', $option_index);

    $form_state->setRebuild(TRUE);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $selected_option = $form_state->getValue('options');
    $nid = $this->entity->id();

    $vote = $this->entityTypeManager->getStorage('vote')->create([
      'entity_type' => $this->entity->getEntityTypeId(),
      'entity_id' => $nid,
      'value_type' => 'percent',
      'value' => $selected_option,
      'tag' => 'parc_core',
      'type' => 'vote',
    ]);
    $vote->save();
  }

  /**
   * @param array $form
   *   The form.
   * @param array $options
   *   The options.
   * @param $entity_id
   *   The entity id.
   *
   * @return array
   *   The results build
   */
  private function buildResults(array $form, array $options, $entity_id) {
    $form = [];
    $vote_counts = [];
    $votes = $this->entityTypeManager->getStorage('vote')->loadByProperties([
      'entity_type' => $this->entity->getEntityTypeId(),
      'entity_id' => $entity_id,
    ]);
    $totalVotes = count($votes);
    $survey_paragraph = $this->entity->get('field_survey')->first()?->entity;
    $question = $survey_paragraph->get('field_question')->value;

    $form['results']['intro'] = [
      '#type' => 'inline_template',
      '#template' => '<p>{{ "Contribute to our survey" | t }}</p><h3 class="survey-title">{{ question }}</h3><p>{{ "Number of answers:" | t }} {{ number }}</p>',
      '#context' => [
        'question' => $question,
        'number' => $totalVotes,
      ],
    ];

    foreach ($votes as $vote) {
      $voteValue = $vote->get('value')->value;
      $vote_counts[$voteValue] = isset($vote_counts[$voteValue]) ? $vote_counts[$voteValue] + 1 : 1;
    }

    $results = [];
    $max = 0;
    $max_index = 0;
    $total = 0;
    foreach ($options as $index => $option) {
      $label = $option;
      $percent = $totalVotes > 0 ? (($vote_counts[$index] ?? 0) / $totalVotes) * 100 : 0;
      $percent = floor($percent);

      if ($percent > $max) {
        $max = $percent;
        $max_index = $index;
      }
      $total += $percent;

      $results[] = [
        'text' => $label,
        'value' => $percent,
      ];
    }

    if ($total < 100) {
      $results[$max_index]['value'] += (100 - $total);
    }

    if (count($options) % 2 == 1) {
      $results[] = [
        'text' => NULL,
        'value' => NULL,
      ];
    }
    $form['results']['results'] = [
      '#theme' => 'parc_survey_results',
      '#results' => $results
    ];

    $color = $survey_paragraph->get('field_background_color')->color;
    $color_class = '';
    if ($color) {
      $color_class = 'override-color';
    }
    $form['#prefix'] = Markup::create("<div class=\"survey-form-wrapper $color_class\" style=\"--survey-color: $color\" id=\"survey-form-wrapper\"><div class=\"container survey-container\">");
    $form['#suffix'] = '</div></div>';
    return $form;
  }

}
