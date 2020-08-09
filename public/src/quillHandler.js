let colorModule = Quill.import('attributors/class/color');
Quill.register(colorModule, true);

let quill = new Quill('#editor-container', {
    modules: {
        toolbar: '#toolbar-container'
    },
    placeholder: 'Compose an epic...',
    theme: 'snow'
});