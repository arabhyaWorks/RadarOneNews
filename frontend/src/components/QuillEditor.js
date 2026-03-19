import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const QuillEditor = forwardRef(({ value, onChange, placeholder, modules, formats, className = '' }, ref) => {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInitializedRef = useRef(false);

  const defaultModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote'],
      ['link'],
      ['clean']
    ],
  };

  const defaultFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote',
    'link'
  ];

  useImperativeHandle(ref, () => ({
    getQuill: () => quillRef.current,
    getHTML: () => quillRef.current?.root.innerHTML || '',
    getText: () => quillRef.current?.getText() || ''
  }));

  const handleTextChange = useCallback(() => {
    if (quillRef.current && onChange) {
      const html = quillRef.current.root.innerHTML;
      onChange(html === '<p><br></p>' ? '' : html);
    }
  }, [onChange]);

  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Create editor container
      const editorContainer = document.createElement('div');
      containerRef.current.appendChild(editorContainer);
      
      // Initialize Quill
      quillRef.current = new Quill(editorContainer, {
        theme: 'snow',
        modules: modules || defaultModules,
        formats: formats || defaultFormats,
        placeholder: placeholder || 'Write something...'
      });

      // Set initial value
      if (value) {
        quillRef.current.root.innerHTML = value;
      }

      // Listen to text changes
      quillRef.current.on('text-change', handleTextChange);
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change', handleTextChange);
      }
    };
  }, []);

  // Update content when value prop changes (only if different)
  useEffect(() => {
    if (quillRef.current && value !== undefined) {
      const currentContent = quillRef.current.root.innerHTML;
      if (currentContent !== value && value !== (currentContent === '<p><br></p>' ? '' : currentContent)) {
        const selection = quillRef.current.getSelection();
        quillRef.current.root.innerHTML = value || '';
        if (selection) {
          quillRef.current.setSelection(selection);
        }
      }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className={`quill-editor-container ${className}`}
      style={{ minHeight: '300px' }}
    />
  );
});

QuillEditor.displayName = 'QuillEditor';

export { QuillEditor };
