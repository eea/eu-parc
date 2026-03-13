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
    if ($entity) {
      $this->entity = $entity;
    } else {
      $entity = $this->entity;
    }

    $survey_paragraph = $entity->get('field_survey')->first()?->entity;
    if (!$survey_paragraph) {
      return $form;
    }

    $questions = [];
    if ($survey_paragraph->hasField('field_questions') && !$survey_paragraph->get('field_questions')->isEmpty()) {
      $questions = $survey_paragraph->get('field_questions')->referencedEntities();
    } else {
      // Fallback
      $questions = [$survey_paragraph];
    }

    if (empty($questions)) {
      return $form;
    }

    $current_question_index = $form_state->get('current_question') ?? 0;
    
    $has_multiple = count($questions) > 1;
    $has_body = $survey_paragraph->hasField('field_body') && !$survey_paragraph->get('field_body')->isEmpty();
    
    $max_index = count($questions) - 1;
    if ($has_multiple && $has_body) {
      $max_index = count($questions);
    }

    // Bounds check
    if ($current_question_index < 0) {
      $current_question_index = 0;
    }
    if ($current_question_index > $max_index) {
      $current_question_index = $max_index;
    }

    $is_completed = $current_question_index == count($questions);
    $render_question_index = $is_completed ? count($questions) - 1 : $current_question_index;
    $current_question = $questions[$render_question_index];
    $question_id = $current_question->id();
    $question_text = $current_question->get('field_question')->value;
    $options = $current_question->get('field_options')->getValue();
    $options = array_column($options, 'value');

    $voteStorage = $this->entityTypeManager->getStorage('vote');

    $entity_type = $current_question->getEntityTypeId() === 'paragraph' && $current_question->bundle() === 'survey_question' ? 'paragraph' : $entity->getEntityTypeId();
    $vote_entity_id = $entity_type === 'paragraph' ? $question_id : $entity->id();

    $hasVoted = $is_completed ? TRUE : $voteStorage
      ->getQuery()
      ->condition('entity_type', $entity_type)
      ->condition('entity_id', $vote_entity_id)
      ->condition('vote_source', Vote::getCurrentIp())
      ->count()
      ->accessCheck(FALSE)
      ->execute();

    $numberOfVotes = $voteStorage
      ->getQuery()
      ->condition('entity_type', $entity_type)
      ->condition('entity_id', $vote_entity_id)
      ->count()
      ->accessCheck(FALSE)
      ->execute();

    $form['anchor'] = [
      '#markup' => '<div id="survey"></div>',
    ];

    $form['question'] = [
      '#type' => 'inline_template',
      '#template' => '<p>{{ "Contribute to our survey" | t }}</p><h3 class="survey-title">{{ question }}</h3><p class="number-of-answers">{{ "Number of answers:" | t }} {{ number }}</p>',
      '#context' => [
        'question' => $question_text,
        'number' => $numberOfVotes,
      ],
    ];

    $content_prefix = '<div class="survey-content-grid"><div class="survey-main-content' . ($is_completed ? ' is-completed' : '') . '">';
    $content_suffix = '</div>';

    if ($hasVoted) {
      $form = $this->buildResults($form, $options, $vote_entity_id, $entity_type, $question_text, $numberOfVotes, $survey_paragraph, count($questions), $current_question_index);
      $form['results']['#prefix'] = $content_prefix;
      $form['results']['#suffix'] = $content_suffix;
    } else {
      $form['options'] = [
        '#type' => 'container',
        '#attributes' => ['class' => ['survey-options']],
        '#prefix' => $content_prefix,
        '#suffix' => $content_suffix,
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
        $form['options']['empty_option'] = [
          '#markup' => '<div class="survey-option empty"></div>',
        ];
      }
    }
    
    if ($is_completed) {
      $form['completion_message'] = [
        '#type' => 'processed_text',
        '#text' => $survey_paragraph->get('field_body')->value,
        '#format' => $survey_paragraph->get('field_body')->format,
        '#prefix' => '<div class="survey-completion">',
        '#suffix' => '</div></div>',
      ];
    } else {
      $form['grid_close'] = [
        '#markup' => '</div>',
      ];
    }

    // Progress and Navigation (Only if it's new structure with multiple questions)
    if ($has_multiple) {
      $this->buildNavigation($form, $form_state, $current_question_index, count($questions), $hasVoted, $survey_paragraph);
    }

    $form['#attributes']['class'][] = 'container';
    $form['#attributes']['class'][] = 'survey-container';
    $form['#attributes']['class'][] = $is_completed ? 'is-completed' : 'not-completed';

    $color = $survey_paragraph->get('field_background_color')->color;
    $color_class = $color ? 'override-color' : '';
    if ($is_completed) {
      $color_class .= ' survey-completed-step';
    }
    if (empty($color)) {
      $color = '#B0E5DF';
    }
    
    if (!isset($form['#prefix'])) {
      $form['#prefix'] = Markup::create("<div class=\"survey-form-wrapper $color_class\" style=\"--survey-color: $color;\" id=\"survey-form-wrapper\">");
      $form['#suffix'] = '</div>';
    }

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function ajaxSubmit(array &$form, FormStateInterface $form_state) {
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

    $survey_paragraph = $this->entity->get('field_survey')->first()?->entity;
    $questions = [];
    if ($survey_paragraph->hasField('field_questions') && !$survey_paragraph->get('field_questions')->isEmpty()) {
      $questions = $survey_paragraph->get('field_questions')->referencedEntities();
    } else {
      $questions = [$survey_paragraph];
    }
    
    $current_question_index = $form_state->get('current_question') ?? 0;
    $current_question = $questions[$current_question_index];
    
    $entity_type = $current_question->getEntityTypeId() === 'paragraph' && $current_question->bundle() === 'survey_question' ? 'paragraph' : $this->entity->getEntityTypeId();
    $entity_id = $entity_type === 'paragraph' ? $current_question->id() : $this->entity->id();

    $vote_storage = $this->entityTypeManager->getStorage('vote');
    
    // Prevent double voting just in case
    $hasVoted = $vote_storage
      ->getQuery()
      ->condition('entity_type', $entity_type)
      ->condition('entity_id', $entity_id)
      ->condition('vote_source', Vote::getCurrentIp())
      ->count()
      ->accessCheck(FALSE)
      ->execute();
      
    if (!$hasVoted) {
      $vote = $vote_storage->create([
        'entity_type' => $entity_type,
        'entity_id' => $entity_id,
        'value_type' => 'percent',
        'value' => $option_index,
        'tag' => 'parc_core',
        'type' => 'vote',
      ]);
      $vote->save();
    }

    $form_state->set('voted', TRUE);
    $form_state->set('option_index', $option_index);

    $form_state->setRebuild(TRUE);
  }
  
  /**
   * Navigate to next/prev question.
   */
  public function ajaxNavigateSubmit(array &$form, FormStateInterface $form_state) {
    $triggering_element = $form_state->getTriggeringElement();
    $clicked_button_name = $triggering_element['#name'];
    
    $current = $form_state->get('current_question') ?? 0;
    
    if ($clicked_button_name === 'next_question') {
      $form_state->set('current_question', $current + 1);
    } elseif ($clicked_button_name === 'prev_question') {
      $form_state->set('current_question', max(0, $current - 1));
    }
    
    // Reset voted state for the next question view logic. 
    // It will be re-evaluated in buildForm.
    $form_state->set('voted', FALSE);
    
    $form_state->setRebuild(TRUE);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    // Only used for non-JS falback
    $selected_option = $form_state->getValue('options');
    // Not implemented fully since it relies heavily on Ajax
  }

  /**
   * Adds navigation buttons and progress bar to form.
   */
  private function buildNavigation(array &$form, FormStateInterface $form_state, $current_index, $total_questions, $has_voted, $survey_paragraph = NULL) {
    if ($total_questions <= 1) {
      return;
    }
      
    $has_body = $survey_paragraph && $survey_paragraph->hasField('field_body') && !$survey_paragraph->get('field_body')->isEmpty();
      
    if ($current_index == $total_questions) {
      $answered_questions = $total_questions;
    } else {
      $answered_questions = $current_index + ($has_voted ? 1 : 0);
    }
    
    $progress_percent = $total_questions > 0 ? floor(($answered_questions / $total_questions) * 100) : 0;
    if ($progress_percent > 100) $progress_percent = 100;
      
    $form['navigation'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['survey-navigation']],
    ];
    
    // Bottom left: Progress bar
    $form['navigation']['progress'] = [
      '#type' => 'inline_template',
      '#template' => '<div class="survey-progress-wrapper"><div class="survey-progress-bar" style="width: {{ percent }}%;"></div><div class="survey-progress-text">{{ "@percent% of survey completed"|t({"@percent": percent}) }}</div></div>',
      '#context' => [
        'percent' => $progress_percent,
      ],
    ];
    
    // Bottom right: Next/Prev buttons
    $form['navigation']['actions'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['survey-nav-actions']],
    ];

    if ($current_index > 0) {
      $form['navigation']['actions']['prev'] = [
        '#type' => 'submit',
        '#value' => $current_index == $total_questions ? $this->t('Back') : $this->t('Previous question'),
        '#name' => 'prev_question',
        '#submit' => ['::ajaxNavigateSubmit'],
        '#ajax' => [
          'callback' => '::ajaxSubmit',
          'wrapper' => 'survey-form-wrapper',
          'progress' => [
            'type' => 'none',
          ]
        ],
        '#attributes' => ['class' => ['survey-btn', 'survey-btn-prev']],
        '#prefix' => '<span class="survey-btn-wrapper survey-btn-prev-wrapper">',
        '#suffix' => '</span>',
      ];
    }

    if ($current_index < $total_questions - 1) {
      if ($has_voted) {
        $form['navigation']['actions']['next'] = [
          '#type' => 'submit',
          '#value' => $this->t('Next question'),
          '#name' => 'next_question',
          '#submit' => ['::ajaxNavigateSubmit'],
          '#ajax' => [
            'callback' => '::ajaxSubmit',
            'wrapper' => 'survey-form-wrapper',
            'progress' => [
              'type' => 'none',
            ]
          ],
          '#attributes' => ['class' => ['survey-btn', 'survey-btn-next']],
          '#prefix' => '<span class="survey-btn-wrapper survey-btn-next-wrapper">',
          '#suffix' => '</span>',
        ];
      }
    } elseif ($current_index == $total_questions - 1 && $has_voted && $has_body) {
      $form['navigation']['actions']['next'] = [
        '#type' => 'submit',
        '#value' => $this->t('Complete survey'),
        '#name' => 'next_question',
        '#submit' => ['::ajaxNavigateSubmit'],
        '#ajax' => [
          'callback' => '::ajaxSubmit',
          'wrapper' => 'survey-form-wrapper',
          'progress' => [
            'type' => 'none',
          ]
        ],
        '#attributes' => ['class' => ['survey-btn', 'survey-btn-next']],
        '#prefix' => '<span class="survey-btn-wrapper survey-btn-next-wrapper">',
        '#suffix' => '</span>',
      ];
    }
  }

  /**
   * @param array $form
   *   The form.
   * @param array $options
   *   The options.
   * @param $entity_id
   *   The entity id to load votes from.
   * @param $entity_type
   *   The entity type to load votes from.
   *
   * @return array
   *   The results build
   */
  private function buildResults(array $form, array $options, $entity_id, $entity_type, $question_text, $totalVotes, $survey_paragraph, $total_questions = 1, $current_index = 0) {
    // Keep anchor and question
    $keys_to_keep = ['anchor', 'question'];
    foreach (array_keys($form) as $key) {
      if (!in_array($key, $keys_to_keep) && strpos($key, '#') !== 0) {
        unset($form[$key]);
      }
    }

    $vote_counts = [];
    $votes = $this->entityTypeManager->getStorage('vote')->loadByProperties([
      'entity_type' => $entity_type,
      'entity_id' => $entity_id,
    ]);

    foreach ($votes as $vote) {
      $voteValue = $vote->get('value')->value;
      $vote_counts[$voteValue] = isset($vote_counts[$voteValue]) ? $vote_counts[$voteValue] + 1 : 1;
    }

    $results = [];
    $max = 0;
    $max_index = 0;
    $total = 0;
    foreach ($options as $index => $option) {
      $percent = $totalVotes > 0 ? (($vote_counts[$index] ?? 0) / $totalVotes) * 100 : 0;
      $percent = floor($percent);

      if ($percent > $max) {
        $max = $percent;
        $max_index = $index;
      }
      $total += $percent;

      $results[] = [
        'text' => $option,
        'value' => $percent,
      ];
    }

    if ($total < 100 && $total > 0 && isset($results[$max_index])) {
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
    else {
      $color = '#B0E5DF';
    }
    $form['#prefix'] = Markup::create("<div class=\"survey-form-wrapper $color_class\" style=\"--survey-color: $color\" id=\"survey-form-wrapper\"><div class=\"container survey-container\">");
    $form['#suffix'] = '</div></div>';
    
    return $form;
  }

}
