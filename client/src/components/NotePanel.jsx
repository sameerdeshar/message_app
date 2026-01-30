import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, StickyNote, Clock, User } from 'lucide-react';
import { useGetNoteQuery, useSaveNoteMutation, useDeleteNoteMutation } from '../features/notes/notesApi';

const NotePanel = ({ customerId, isOpen, onClose }) => {
    const { data: note, isLoading } = useGetNoteQuery(customerId, { skip: !customerId });
    const [saveNote, { isLoading: isSaving }] = useSaveNoteMutation();
    const [deleteNote] = useDeleteNoteMutation();

    const [content, setContent] = useState('');
    const [lastSaved, setLastSaved] = useState(null);

    useEffect(() => {
        if (note) {
            setContent(note.content || '');
        }
    }, [note]);

    const handleSave = async () => {
        if (!customerId) return;
        try {
            await saveNote({ customerId, content }).unwrap();
            setLastSaved(new Date());
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
        <div className={`fixed inset-y-0 right-0 w-80 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Glassmorphism background */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-l border-white/20 shadow-2xl" />

            <div className="relative h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <StickyNote className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-gray-900">User Notes</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write something about this user..."
                        className="flex-1 w-full p-4 bg-white/50 border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-gray-800 placeholder-gray-400 backdrop-blur-sm"
                    />
                </div>

                <div className="mt-6 space-y-4">
                    {note?.last_editor_name && (
                        <div className="flex flex-col gap-1 px-1">
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <User className="w-3 h-3" />
                                <span>Last edited by: <span className="font-medium text-gray-700">{note.last_editor_name}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(note.updated_at).toLocaleString()} (Server Time)</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={!note?.content}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                            title="Delete Note"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || content === note?.content}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>Save Note</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotePanel;
