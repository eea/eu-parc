# Tabs Header Component Usage Example

## Basic Usage

```twig
{% include 'parc:tabs-header' with {
  title: 'Chemicals Overview',
  color: '#007dbb',
  menu_entries: [
    {
      title: 'Overview',
      link: '/chemicals',
      is_active: true
    },
    {
      title: 'Health Effects',
      link: '/chemicals/health-effects',
      is_active: false
    },
    {
      title: 'Exposure Sources',
      link: '/chemicals/exposure-sources',
      is_active: false
    }
  ]
} %}
```

## Props

- **title** (string): The main title displayed in svg-title font
- **color** (string): Background color for the hero section (optional)
- **menu_entries** (array): Array of menu items with:
  - **title** (string): Menu item text
  - **link** (string): URL for the menu item
  - **is_active** (boolean): Whether this menu item is currently active
