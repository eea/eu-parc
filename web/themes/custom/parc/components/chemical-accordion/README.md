# Chemical Accordion

Created a responsive chemical accordion with tabbed content.

## Features
- Expandable header with Title, Subtitle, and Summary.
- Dynamic colors using `--primary-color` and `--secondary-color` CSS variables.
- Internal tabbed navigation: Overview, What PARC does, What EU does.
- Static "Related" sections at the bottom.

## Props
- `primary_color`: (CSS color) Main theme color.
- `secondary_color`: (CSS color) Background/hover theme color.
- `internal_id`: (string) ID used for targeting (renders as `data-chemical`).

## Slots
- `title`: Main title.
- `subtitle`: Subtitle text.
- `summary`: Short summary shown in closed state.
- `overview`: Detailed overview content.
- `what_parc_does`: Content for PARC involvement.
- `what_eu_does`: Content for EU involvement.
- `related_questions`: Related questions list.
- `related_within_parc`: Related parc links/content.

## Usage
```twig
{% embed 'parc:chemical-accordion' with {
  primary_color: '#00B0D9',
  secondary_color: '#F2F2F2',
  internal_id: 'phtalates'
} only %}
  {% block title %}
    Phthalates
  {% endblock %}
  {% block subtitle %}
    Plasticisers and endocrine disruptors
  {% endblock %}
  {% block summary %}
    Summary text goes here...
  {% endblock %}
  {% block overview %}
    Overview content...
  {% endblock %}
  {% block what_parc_does %}
    PARC details...
  {% endblock %}
  {% block what_eu_does %}
    EU details...
  {% endblock %}
  {% block related_questions %}
    Related questions content...
  {% endblock %}
  {% block related_within_parc %}
    Related PARC content...
  {% endblock %}
{% endembed %}
```
