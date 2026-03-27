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
  // Removed global $entity to avoid clashing when multiple forms are on page.

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The custom form ID.
   *
   * @var string
   */
  protected $customFormId;

  /**
   * Sets the custom form ID.
   *
   * @param string $id
   *   The form ID.
   */
  public function setFormId($id) {
    $this->customFormId = $id;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    if (!empty($this->customFormId)) {
      return $this->customFormId;
    }

    // During AJAX, we need to match the ID from the request.
    $form_id = \Drupal::request()->request->get('form_id');
    if ($form_id && strpos($form_id, 'eu_parc_survey_form_') === 0) {
      return $form_id;
    }

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
      $form_state->set('entity_type', $entity->getEntityTypeId());
      $form_state->set('entity_id', $entity->id());
    } else {
      $entity_type = $form_state->get('entity_type');
      $entity_id = $form_state->get('entity_id');
      if ($entity_type && $entity_id) {
        $entity = $this->entityTypeManager->getStorage($entity_type)->load($entity_id);
      }
    }

    if (!$entity) {
      return $form;
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

    $has_multiple = count($questions) > 1;
    $has_body = $survey_paragraph->hasField('field_body') && !$survey_paragraph->get('field_body')->isEmpty();

    $current_question_index = $form_state->get('current_question');
    if ($current_question_index === NULL) {
      $current_question_index = 0;
      $all_voted = TRUE;
      foreach ($questions as $index => $question) {
        $q_entity_type = $question->getEntityTypeId() === 'paragraph' && $question->bundle() === 'survey_question' ? 'paragraph' : $entity->getEntityTypeId();
        $q_vote_entity_id = $q_entity_type === 'paragraph' ? $question->id() : $entity->id();

        $has_voted_on_q = $this->entityTypeManager->getStorage('vote')
          ->getQuery()
          ->condition('entity_type', $q_entity_type)
          ->condition('entity_id', $q_vote_entity_id)
          ->condition('vote_source', Vote::getCurrentIp())
          ->count()
          ->accessCheck(FALSE)
          ->execute();

        if (!$has_voted_on_q) {
          $current_question_index = $index;
          $all_voted = FALSE;
          break;
        }
      }

      if ($all_voted) {
        $current_question_index = $has_multiple && $has_body ? count($questions) : count($questions) - 1;
      }
      $form_state->set('current_question', $current_question_index);
    }

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

    $anchor_id = 'survey';
    if ($entity) {
      $anchor_id .= '-' . $entity->getEntityTypeId() . '-' . $entity->id();
    }
    $form['anchor'] = [
      '#markup' => "<div id=\"$anchor_id\"></div>",
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
      $form['results'] = $this->buildResults($options, $vote_entity_id, $entity_type, $question_text, $numberOfVotes, $survey_paragraph, count($questions), $current_question_index);
      $form['results']['#prefix'] = $content_prefix;
      $form['results']['#suffix'] = $content_suffix;
    } else {
      $form['options'] = [
        '#type' => 'container',
        '#attributes' => ['class' => ['survey-options']],
        '#prefix' => $content_prefix,
        '#suffix' => $content_suffix,
      ];

      $wrapper_id = 'survey-form-wrapper';
      if ($entity) {
        $wrapper_id .= '-' . $entity->getEntityTypeId() . '-' . $entity->id();
      }

      $button_name_prefix = 'vote_' . $entity->getEntityTypeId() . '_' . $entity->id() . '_';

      foreach ($options as $index => $label) {
        $form['options'][$index] = [
          '#type' => 'submit',
          '#value' => $label,
          '#name' => $button_name_prefix . $index,
          '#attributes' => [
            'class' => ['survey-option-link'],
          ],
          '#ajax' => [
            'callback' => '::ajaxSubmit',
            'wrapper' => $wrapper_id,
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
      $wrapper_id = 'survey-form-wrapper';
      if ($entity) {
        $wrapper_id .= '-' . $entity->getEntityTypeId() . '-' . $entity->id();
      }
      $this->buildNavigation($form, $form_state, $current_question_index, count($questions), $hasVoted, $survey_paragraph, $wrapper_id);
    }

    $form['#attributes']['class'][] = 'container';
    $form['#attributes']['class'][] = 'survey-container';
    $form['#attributes']['class'][] = $is_completed ? 'is-completed' : 'not-completed';

    if ($entity) {
      $form['#id'] = 'eu-parc-survey-form-' . $entity->getEntityTypeId() . '-' . $entity->id();
    }

    $color = $survey_paragraph->get('field_background_color')->color;
    $color_class = $color ? 'override-color' : '';
    if ($is_completed) {
      $color_class .= ' survey-completed-step';
    }
    if (empty($color)) {
      $color = '#B0E5DF';
    }
    
    $form['#attached']['library'][] = 'parc/survey';

    if (!isset($form['#prefix'])) {
      $wrapper_id = 'survey-form-wrapper';
      if ($entity) {
        $wrapper_id .= '-' . $entity->getEntityTypeId() . '-' . $entity->id();
      }
      $form['#prefix'] = Markup::create("<div class=\"survey-form-wrapper $color_class\" style=\"--survey-color: $color;\" id=\"$wrapper_id\">");
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
    $parts = explode('_', $clicked_button_name);
    $option_index = end($parts);
    $entity_type = $form_state->get('entity_type');
    $entity_id = $form_state->get('entity_id');
    $entity = $this->entityTypeManager->getStorage($entity_type)->load($entity_id);

    $survey_paragraph = $entity->get('field_survey')->first()?->entity;
    $questions = [];
    if ($survey_paragraph->hasField('field_questions') && !$survey_paragraph->get('field_questions')->isEmpty()) {
      $questions = $survey_paragraph->get('field_questions')->referencedEntities();
    } else {
      $questions = [$survey_paragraph];
    }
    
    $current_question_index = $form_state->get('current_question') ?? 0;
    $current_question = $questions[$current_question_index];
    
    $entity_type_vote = $current_question->getEntityTypeId() === 'paragraph' && $current_question->bundle() === 'survey_question' ? 'paragraph' : $entity_type;
    $entity_id_vote = $entity_type_vote === 'paragraph' ? $current_question->id() : $entity_id;

    $vote_storage = $this->entityTypeManager->getStorage('vote');
    
    // Prevent double voting just in case
    $hasVoted = $vote_storage
      ->getQuery()
      ->condition('entity_type', $entity_type_vote)
      ->condition('entity_id', $entity_id_vote)
      ->condition('vote_source', Vote::getCurrentIp())
      ->count()
      ->accessCheck(FALSE)
      ->execute();
      
    if (!$hasVoted) {
      $vote = $vote_storage->create([
        'entity_type' => $entity_type_vote,
        'entity_id' => $entity_id_vote,
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
    
    if (strpos($clicked_button_name, 'next_question') === 0) {
      $form_state->set('current_question', $current + 1);
    } elseif (strpos($clicked_button_name, 'prev_question') === 0) {
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
  private function buildNavigation(array &$form, FormStateInterface $form_state, $current_index, $total_questions, $has_voted, $survey_paragraph = NULL, $wrapper_id = 'survey-form-wrapper') {
    $entity_type = $form_state->get('entity_type');
    $entity_id = $form_state->get('entity_id');
    $button_suffix = $entity_type && $entity_id ? '_' . $entity_type . '_' . $entity_id : '';
    if ($total_questions <= 1) {
      return;
    }

    $has_body = $survey_paragraph && $survey_paragraph->hasField('field_body') && !$survey_paragraph->get('field_body')->isEmpty();

    // First question, not yet answered: show no navigation at all.
    if ($current_index === 0 && !$has_voted) {
      return;
    }

    // First question, just voted for the first time: show thank you + "more?" button.
    $just_voted = $form_state->get('voted') === TRUE;
    if ($current_index === 0 && $has_voted && $just_voted) {
      $form['navigation'] = [
        '#type' => 'container',
        '#attributes' => ['class' => ['survey-navigation', 'survey-navigation--first-vote']],
      ];
      $form['navigation']['thank_you'] = [
        '#markup' => '<div class="survey-first-vote-thanks">' . $this->t('Thank you for contributing to our mini-survey.') . '</div>',
      ];
      $form['navigation']['actions'] = [
        '#type' => 'container',
        '#attributes' => ['class' => ['survey-nav-actions']],
      ];
      $form['navigation']['actions']['next'] = [
        '#type' => 'submit',
        '#value' => $this->t('Would you like to answer more questions?'),
        '#name' => 'next_question' . $button_suffix,
        '#submit' => ['::ajaxNavigateSubmit'],
        '#ajax' => [
          'callback' => '::ajaxSubmit',
          'wrapper' => $wrapper_id,
          'progress' => [
            'type' => 'none',
          ]
        ],
        '#attributes' => ['class' => ['survey-btn', 'survey-btn-next', 'survey-btn-more']],
        '#prefix' => '<span class="survey-btn-wrapper survey-btn-next-wrapper">',
        '#suffix' => '</span>',
      ];
      return;
    }

    // Normal navigation for Q2+ or when navigating back to Q1.
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
        '#name' => 'prev_question' . $button_suffix,
        '#submit' => ['::ajaxNavigateSubmit'],
        '#ajax' => [
          'callback' => '::ajaxSubmit',
          'wrapper' => $wrapper_id,
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
          '#name' => 'next_question' . $button_suffix,
          '#submit' => ['::ajaxNavigateSubmit'],
          '#ajax' => [
            'callback' => '::ajaxSubmit',
            'wrapper' => $wrapper_id,
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
        '#name' => 'next_question' . $button_suffix,
        '#submit' => ['::ajaxNavigateSubmit'],
        '#ajax' => [
          'callback' => '::ajaxSubmit',
          'wrapper' => $wrapper_id,
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
  private function buildResults(array $options, $entity_id, $entity_type, $question_text, $totalVotes, $survey_paragraph, $total_questions = 1, $current_index = 0) {


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
    
    return [
      '#theme' => 'parc_survey_results',
      '#results' => $results,
      '#id' => 'parc-survey-results-' . $entity_type . '-' . $entity_id,
    ];
  }

}
