import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
    Link as LinkIcon, Undo, Redo, Palette, Heading1, Heading2
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
}

const MenuButton = ({ onClick, isActive, disabled, title, children }: any) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-1.5 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

const COLORS = [
    '#1e293b', '#334155', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#d946ef', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6'
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    content,
    onChange,
    placeholder = 'Escribe aquí...',
    minHeight = '200px'
}) => {
    const [showColorPicker, setShowColorPicker] = React.useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
                style: `min-height: ${minHeight}`,
            },
        },
    });

    if (!editor) {
        return null;
    }

    const addLink = () => {
        const url = window.prompt('URL del enlace:');
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    };

    return (
        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-slate-200 bg-slate-50">
                {/* History */}
                <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
                    <Undo size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
                    <Redo size={16} />
                </MenuButton>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Headings */}
                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título 1">
                    <Heading1 size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título 2">
                    <Heading2 size={16} />
                </MenuButton>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Text Formatting */}
                <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrita">
                    <Bold size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Cursiva">
                    <Italic size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Subrayado">
                    <UnderlineIcon size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado">
                    <Strikethrough size={16} />
                </MenuButton>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Color Picker */}
                <div className="relative">
                    <MenuButton onClick={() => setShowColorPicker(!showColorPicker)} title="Color de texto">
                        <Palette size={16} />
                    </MenuButton>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-slate-200 z-10 grid grid-cols-5 gap-1">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().setColor(color).run();
                                        setShowColorPicker(false);
                                    }}
                                    className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Lists */}
                <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista con viñetas">
                    <List size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista numerada">
                    <ListOrdered size={16} />
                </MenuButton>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Alignment */}
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Alinear Izquierda">
                    <AlignLeft size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centrar">
                    <AlignCenter size={16} />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Alinear Derecha">
                    <AlignRight size={16} />
                </MenuButton>

                <div className="w-px h-5 bg-slate-300 mx-1" />

                {/* Link */}
                <MenuButton onClick={addLink} isActive={editor.isActive('link')} title="Insertar Enlace">
                    <LinkIcon size={16} />
                </MenuButton>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />

            {/* Placeholder logic (TipTap handles this via extension, but we show hint if empty) */}
            {editor.isEmpty && (
                <div className="absolute top-12 left-4 text-slate-400 pointer-events-none text-sm">
                    {placeholder}
                </div>
            )}

            {/* Styles for TipTap */}
            <style>{`
        .ProseMirror {
          min-height: ${minHeight};
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
        }
        .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
        </div>
    );
};
