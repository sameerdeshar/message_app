import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, StickyNote, Clock, User, Pin } from 'lucide-react';
import { useGetNoteQuery, useSaveNoteMutation, useDeleteNoteMutation } from '../features/notes/notesApi';

const NotePanel = ({ customerId, isOpen, onClose }) => {
    const { data: note, isLoading } = useGetNoteQuery(customerId, { skip: !customerId });
    const [saveNote, { isLoading: isSaving }] = useSaveNoteMutation();
    const [deleteNote] = useDeleteNoteMutation();

    const [content, setContent] = useState('');

    useEffect(() => {
        if (note) {
            setContent(note.content || '');
        }
    }, [note]);

    const handleSave = async () => {
        if (!customerId) return;
        try {
            await saveNote({ customerId, content }).unwrap();
        } catch (err) {
            console.error('Failed to save note:', err);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await deleteNote(customerId).unwrap();
            setContent('');
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed top-24 right-4 bottom-10 w-80 z-50 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
            {/* Paper-style Container - Matched to Screenshot Size */}
            <div className="relative h-full flex flex-col bg-[#fffef5] border border-amber-200/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] rounded-[2.5rem] overflow-hidden">
                {/* Decorative header */}
                <div className="h-1.5 bg-amber-400/30 w-full" />

                <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200/50 bg-white/40 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-yellow-100 rounded-lg">
                            <StickyNote className="w-4 h-4 text-yellow-700" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm">User Note</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-yellow-200/50 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Type an internal note here..."
                        className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed scrollbar-hide"
                        style={{ backgroundImage: 'linear-gradient(transparent, transparent 27px, #fef3c7 27px)', backgroundSize: '100% 28px' }}
                    />
                </div>

                {note?.last_editor_name && (
                    <div className="px-4 py-2 bg-yellow-100/30 border-t border-yellow-200/40">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <User className="w-3 h-3 text-yellow-600" />
                            <span><span className="font-semibold">{note.last_editor_name}</span> updated this</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(note.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <div className="p-3 bg-white/60 backdrop-blur-md flex gap-2">
                    <button
                        onClick={handleDelete}
                        disabled={!note?.content}
                        className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all disabled:opacity-20"
                        title="Discard Note"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || content === note?.content}
                        className="flex-1 bg-yellow-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-600 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotePanel;
