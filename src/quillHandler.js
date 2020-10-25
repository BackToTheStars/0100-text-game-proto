import Quill from 'quill';
const colorModule = Quill.import('attributors/class/color');

Quill.register(colorModule, true);

const getQuill = (containerSelector, toolbarSelector) => {
    const quill = new Quill(containerSelector, { // '#editor-container', {
        modules: {
            toolbar: {
                container: toolbarSelector, // '#toolbar-container',
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

    return {
        quill,
        getQuillTextArr
    }
}

export { getQuill };
