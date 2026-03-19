import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QuillEditor = forwardRef(({ value, onChange, placeholder, modules, formats, className = '', token }, ref) => {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInitializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const lastValueRef = useRef(value);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Keep the onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const defaultModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const defaultFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  const notifyChange = () => {
    if (quillRef.current && onChangeRef.current) {
      const html = quillRef.current.root.innerHTML;
      // Normalize empty content
      const normalizedHtml = (html === '<p><br></p>' || html === '<p></p>' || html === '') ? '' : html;
      
      // Only notify if actually changed
      if (normalizedHtml !== lastValueRef.current) {
        lastValueRef.current = normalizedHtml;
        onChangeRef.current(normalizedHtml);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    getQuill: () => quillRef.current,
    getHTML: () => quillRef.current?.root.innerHTML || '',
    getText: () => quillRef.current?.getText() || '',
    triggerChange: notifyChange
  }));

  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Create editor container
      const editorContainer = document.createElement('div');
      containerRef.current.appendChild(editorContainer);
      
      // Initialize Quill
      const quill = new Quill(editorContainer, {
        theme: 'snow',
        modules: modules || defaultModules,
        formats: formats || defaultFormats,
        placeholder: placeholder || 'Write something...'
      });
      
      quillRef.current = quill;

      // Override image handler — upload to S3 instead of base64
      const toolbar = quill.getModule('toolbar');
      toolbar.addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;

          const formData = new FormData();
          formData.append('image', file);

          try {
            const res = await fetch(`${API}/upload/image`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${tokenRef.current}` },
              body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();

            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url, 'user');
            quill.setSelection(range.index + 1, 0, 'silent');
          } catch (err) {
            console.error('[QuillEditor] image upload failed:', err);
          }
        };
      });

      // Set initial value
      if (value) {
        quill.root.innerHTML = value;
        lastValueRef.current = value;
      }

      // Listen to text-change event from Quill
      quill.on('text-change', (delta, oldDelta, source) => {
        // Only respond to user-initiated changes
        if (source === 'user' || source === 'api') {
          notifyChange();
        }
      });

      // Also listen to selection change for good measure
      quill.on('selection-change', (range, oldRange, source) => {
        if (source === 'user' && oldRange && !range) {
          // User has blurred the editor, ensure we have latest content
          notifyChange();
        }
      });

      // Backup: Use input event on the contenteditable
      quill.root.addEventListener('input', () => {
        notifyChange();
      });

      // Backup: Use blur event
      quill.root.addEventListener('blur', () => {
        notifyChange();
      });
    }

    return () => {
      // Cleanup handled by component unmount
    };
  }, []);

  // Update content when value prop changes from external source
  useEffect(() => {
    if (quillRef.current && value !== undefined && isInitializedRef.current) {
      const currentContent = quillRef.current.root.innerHTML;
      const normalizedCurrent = (currentContent === '<p><br></p>' || currentContent === '<p></p>') ? '' : currentContent;
      
      // Only update if the value is truly different (avoid cursor jump)
      if (value !== normalizedCurrent && value !== lastValueRef.current) {
        const selection = quillRef.current.getSelection();
        quillRef.current.root.innerHTML = value || '';
        lastValueRef.current = value || '';
        // Try to restore selection
        if (selection && value) {
          try {
            quillRef.current.setSelection(selection);
          } catch (e) {
            // Selection restoration failed, ignore
          }
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
