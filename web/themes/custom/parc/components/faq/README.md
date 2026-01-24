# FAQ Component

A simple accordion component for Questions and Answers.

## Features
- Expandable header with Question.
- Answer content shown when expanded.
- Smooth CSS transitions.

## Slots (Blocks)
- `question`: The text of the question.
- `answer`: The detailed answer content.

## Usage
```twig
{% embed 'parc:faq' %}
  {% block question %}
    How does PARC contribute to chemical safety?
  {% endblock %}
  {% block answer %}
    PARC focuses on developing new risk assessment methods and improving data sharing...
  {% endblock %}
{% endembed %}
```
