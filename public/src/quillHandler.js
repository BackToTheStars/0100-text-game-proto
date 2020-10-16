let colorModule = Quill.import('attributors/class/color');
Quill.register(colorModule, true);

let quill = new Quill('#editor-container', {
  modules: {
    toolbar: '#toolbar-container'
  },
  placeholder: 'Compose an epic...',
  theme: 'snow'
});

function getQuillTextArr() {
  const ops = quill.editor.delta.ops
  console.log(`getQuillTextArr: ${JSON.stringify(ops)}`);
  return ops;
}