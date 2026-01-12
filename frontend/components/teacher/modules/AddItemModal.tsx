import React, { useState, useEffect } from 'react';
import { BookOpen, FileQuestion, HelpCircle, Plus, Video, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ContentItem } from './types';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { title: string; type: ContentItem['type']; duration: string; file?: File }) => void;
}

export function AddItemModal({ isOpen, onClose, onConfirm }: AddItemModalProps) {
    const [newItemData, setNewItemData] = useState<{ title: string; type: ContentItem['type']; duration: string; file?: File }>({
        title: '',
        type: 'video',
        duration: ''
    });

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setNewItemData({ title: '', type: 'video', duration: '' });
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm(newItemData);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setNewItemData({ ...newItemData, file: e.target.files[0] });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Content Item"
            size="md"
        >
            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {(['video', 'reading'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setNewItemData({ ...newItemData, type })}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${newItemData.type === type ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {type === 'video' && <Video size={20} className="mb-2" />}
                                {type === 'reading' && <BookOpen size={20} className="mb-2" />}

                                <span className="text-xs uppercase tracking-wide truncate w-full text-center">{type}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g., Introduction to React"
                        value={newItemData.title}
                        onChange={(e) => setNewItemData({ ...newItemData, title: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && newItemData.title && handleConfirm()}
                    />
                </div>

                {(newItemData.type === 'video' || newItemData.type === 'reading' || newItemData.type === 'quiz' || newItemData.type === 'assignment' || newItemData.type === 'material') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {newItemData.type === 'video' ? 'Video File' : (newItemData.type === 'material' ? 'Study Material (PDF/Image)' : 'Markdown File')}
                        </label>
                        <input
                            type="file"
                            accept={
                                newItemData.type === 'video' ? "video/*" :
                                    newItemData.type === 'material' ? ".pdf,image/*" :
                                        ".md,.markdown"
                            }
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            onChange={handleFileChange}
                        />
                        {newItemData.file && (
                            <p className="mt-1 text-xs text-green-600">Selected: {newItemData.file.name}</p>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (optional)</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g., 10m"
                        value={newItemData.duration}
                        onChange={(e) => setNewItemData({ ...newItemData, duration: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && newItemData.title && handleConfirm()}
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!newItemData.title}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Item
                    </button>
                </div>
            </div>
        </Modal>
    );
}
