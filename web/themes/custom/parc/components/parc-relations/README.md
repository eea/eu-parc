# PARC Relations Component

Displays a list of related links with a header.

## Props
- `title`: (string) The title for the relations section.
- `items_left`: (array) Items for the left column.
- `items_right`: (array) Items for the right column.

Items contain:
  - `link`: (object)
    - `uri`: (string) The URL for the link.
    - `title`: (string) The text for the link.
  - `color`: (string, optional) CSS color for the bullet and hover state.

## Features
- Split layout support with `items_left` and `items_right`.
- Supporting per-item colors for visual differentiation.
- Standard Drupal behavior in `parc-relations.js`.

## Usage
```twig
{% embed 'parc:parc-relations' with {
  title: 'Related Publications',
  items_left: [
    {
      link: { uri: 'https://example.com/one', title: 'Document One' },
      color: '#00B0D9'
    }
  ],
  items_right: [
    {
      link: { uri: 'https://example.com/two', title: 'Document Two' }
    }
  ]
} only %}{% endembed %}
```
