import Quill from 'quill';
const colorModule = Quill.import('attributors/class/color');

Quill.register(colorModule, true);

const quill = new Quill('#editor-container', {
    modules: {
        toolbar: {
            container: '#toolbar-container',
            /*
       'align': [],
       'size': ['10px', '20px', '80px'],
       'color': ['#FFF', '#000', 'yellow'],
       */
            //[{background: ['#FFF', 'yellow']}]
        },
    },
    placeholder: 'Compose an epic...',
    theme: 'snow',
});

const getQuillTextArr = () => {
    const ops = quill.editor.delta.ops;
    //console.log(`getQuillTextArr: ${JSON.stringify(ops)}`);
    return ops;
};

export { quill, getQuillTextArr };
