<?php
namespace Drupal\parc_core\Form;

use Drupal\Core\Ajax\HtmlCommand;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;
use Drupal\votingapi\Entity\Vote;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\InvokeCommand;

class SurveyForm extends FormBase {

  protected $node;

  public function getFormId() {
    return 'eu_parc_survey_form';
  }

  public function buildForm(array $form, FormStateInterface $form_state, $node = NULL) {
    $this->node = $node;

    $nid = $node->id();
    $survey_paragraph = $node->get('field_survey')->first()?->entity;
    if (!$survey_paragraph) {
      return $form;
    }

    $question = $survey_paragraph->get('field_question')->value;
    $options = $survey_paragraph->get('field_options')->getValue();
    $options = array_column($options, 'value');

    $hasVoted = \Drupal::entityQuery('vote')
    ->condition('entity_type', 'node')
    ->condition('entity_id', $nid)
    ->condition('vote_source', Vote::getCurrentIp())
    ->count()
    ->accessCheck(FALSE)
    ->execute();

    $numberOfVotes = \Drupal::entityQuery('vote')
    ->condition('entity_type', 'node')
    ->condition('entity_id', $nid)
    ->count()
    ->accessCheck(FALSE)
    ->execute();

    $form['question'] = [
      '#markup' => "<p>Contribute to our survey</p><h3>$question</h3><p>Number of answers: $numberOfVotes</p>",
    ];

    if ($hasVoted) {
      return $this->buildResults($form, $options, $nid);
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

    $form['#attributes']['class'][] = 'container';

    $form['#prefix'] = '<div class="survey-form-wrapper" id="survey-form-wrapper">';
    $form['#suffix'] = '</div>';
    return $form;
  }

  public function ajaxSubmit(array &$form, FormStateInterface $form_state) {
    if ($form_state->get('voted')) {
      $options = $this->node->get('field_survey')->first()?->entity->get('field_options')->getValue();
      $options = array_column($options, 'value');
      return $this->buildResults($form, $options, $this->node->id());
    }

    return $form;
  }


  public function ajaxVoteSubmit(array &$form, FormStateInterface $form_state) {
    $triggering_element = $form_state->getTriggeringElement();
    $clicked_button_name = $triggering_element['#name'];
    $option_index = str_replace('vote_', '', $clicked_button_name);

    $nid = $this->node->id();

    $vote = Vote::create([
      'entity_type' => 'node',
      'entity_id' => $nid,
      'value_type' => 'percent',
      'value' => $option_index,
      'tag' => 'parc_core',
      'type' => 'vote',
    ]);
    $vote->save();

    \Drupal::service('page_cache_kill_switch')->trigger();

    $form_state->set('voted', TRUE);
    $form_state->set('option_index', $option_index);

    $form_state->setRebuild(TRUE);
  }


  public function submitForm(array &$form, FormStateInterface $form_state) {
    $selected_option = $form_state->getValue('options');
    $nid = $this->node->id();

    $vote = Vote::create([
      'entity_type' => 'node',
      'entity_id' => $nid,
      'value_type' => 'percent',
      'value' => $selected_option,
      'tag' => 'parc_core',
      'type' => 'vote',
    ]);
    $vote->save();


    \Drupal::service('page_cache_kill_switch')->trigger();
  }

  private function buildResults(array $form, array $options, $nid) {
    $form = [];
    $vote_counts = [];
    $votes = \Drupal::entityTypeManager()->getStorage('vote')->loadByProperties([
      'entity_type' => 'node',
      'entity_id' => $nid,
    ]);
    $totalVotes = count($votes);
    $question = $this->node->get('field_survey')->first()?->entity->get('field_question')->value;

    $form['results']['#markup'] = "<p>Contribute to our survey</p><h3>$question</h3><p>Number of answers: $totalVotes</p>";

    foreach ($votes as $vote) {
      $voteValue = $vote->get('value')->value;
      $vote_counts[$voteValue] = isset($vote_counts[$voteValue]) ? $vote_counts[$voteValue] + 1 : 1;
    }
    $form['results']['#markup'] .= '<ul class="survey-results">';
    foreach ($options as $index => $option) {
      $label = $option;
      $percent = $totalVotes > 0 ? ($vote_counts[$index] / $totalVotes) * 100 : 0;
      $form['results']['#markup'] .= "<li class='survey-result' data-percent='$percent'><p>$label</p> <p>$percent%</p><div class='survey-result-percent'></div></li>";
    }
    $form['#attributes']['class'][] = 'container';
    $form['results']['#markup'] .= '</ul>';
    $form['#prefix'] = '<div class="survey-form-wrapper" id="survey-form-wrapper"><div class="container"';
    $form['#suffix'] = '</div></div>';
    return $form;
  }
}
