/**
 * CKEditor plugin to wrap selected content into a specific wrapper.
 */
(function ($, Drupal, CKEDITOR) {
  // Register the plugin within the editor.
  CKEDITOR.plugins.add('indented_paragraph', {
    requires: 'dialog',
    icons: 'indented_paragraph',
    hidpi: true,
    // The plugin initialization logic goes inside this method.
    init: function (editor) {
      if (editor.blockless)
        return;

      var lang = editor.lang.div,
        allowed = 'div(*)';

      if (CKEDITOR.dialog.isTabEnabled(editor, 'editdiv', 'advanced'))
        allowed += ';div[dir,id,lang,title]{*}';

      editor.addCommand('indented_paragraph', new CKEDITOR.dialogCommand('indented_paragraph', {
        allowedContent: allowed,
        requiredContent: 'div',
        contextSensitive: true,
        contentTransformations: [
          ['div: alignmentToStyle']
        ],
        refresh: function (editor, path) {
          var context = editor.config.div_wrapTable ? path.root : path.blockLimit;
          this.setState('div' in context.getDtd() ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED);
        }
      }));
      CKEDITOR.dialog.add('indented_paragraph', this.path + 'dialogs/div.js');
      // Create the toolbar button that executes the above command.
      editor.ui.addButton('IndentParagraph', {
        label: 'Indent Paragraph',
        command: 'indented_paragraph',
        icon: this.path + 'icons/indented_paragraph.png'
      });
    }
  });
})(jQuery, Drupal, CKEDITOR);
