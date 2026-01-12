"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Menu } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ModuleList } from '@/components/teacher/modules/ModuleList';
import { EditModuleModal } from '@/components/teacher/modules/EditModuleModal';
import { AddItemModal } from '@/components/teacher/modules/AddItemModal';
import { EditContentItemModal } from '@/components/teacher/modules/EditContentItemModal';
import { CreationSidebar } from '@/components/teacher/modules/CreationSidebar';
import { Module, ContentItem, GuidedStep, SidebarRecommendation } from '@/components/teacher/modules/types';
import { v4 as uuidv4 } from 'uuid';

const API_URL = "http://localhost:4000/material/module";
// const UPLOAD_URL = "http://localhost:4000/material/upload";
const INGEST_URL = "http://localhost:4000/rag/ingest";

// Configure axios defaults to send credentials
axios.defaults.withCredentials = true;

function ModulesPageContent() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId') || '';
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);


    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // Modal states
    const [editModuleModalOpen, setEditModuleModalOpen] = useState(false);
    const [addItemModalOpen, setAddItemModalOpen] = useState(false);
    const [editItemModalOpen, setEditItemModalOpen] = useState(false);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [currentItem, setCurrentItem] = useState<{ item: ContentItem; parentId: string } | null>(null);
    const [currentModuleForItem, setCurrentModuleForItem] = useState<string | null>(null);

    // Sidebar state
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile
    const [guidedSteps] = useState<GuidedStep[]>([
        { id: 1, title: 'Create Structure', completed: true, active: false },
        { id: 2, title: 'Upload Content', completed: false, active: true },
        { id: 3, title: 'Refine & Organize', completed: false, active: false }
    ]);
    const [recommendations] = useState<SidebarRecommendation[]>([
        {
            id: 'rec-1',
            title: 'Introduction to Programming',
            source: 'Coursera',
            rating: 4.8,
            reviews: '1.2k',
            modules: []
        },
        {
            id: 'rec-2',
            title: 'Web Development Bootcamp',
            source: 'Udemy',
            rating: 4.9,
            reviews: '2.5k',
            modules: []
        }
    ]);


    // Fetch modules on load
    useEffect(() => {
        if (courseId) {
            fetchModules();
        }
    }, [courseId]);

    const fetchModules = async () => {
        try {
            setLoading(true);
            const cleanCourseId = courseId?.replace(/['"]+/g, '') || '';
            const response = await axios.post(`${API_URL}/get_all_module`, {
                course_id: cleanCourseId
            });
            console.log(response.data, "response.data")
            if (response.data) {
                // Map backend data to frontend Module type
                const mappedModules: Module[] = response.data.map((m: any) => ({
                    id: m._id,
                    title: m.title,
                    description: m.description || '',
                    duration: m.duration || '',
                    isExpanded: false,
                    items: [
                        ...(m.video_id || []).map((v: any) => ({
                            id: v._id,
                            type: 'video',
                            title: v.title,
                            duration: '10m', // Placeholder
                            azureId: v.azure_id
                        })),
                        ...(m.notes_id || []).map((n: any) => ({
                            id: n._id,
                            type: 'reading',
                            title: n.title || 'Module Notes',
                            duration: '5m', // Placeholder
                            azureId: n.azure_id
                        }))
                    ],
                    learningObjectives: []
                }));
                setModules(mappedModules);
            }
        } catch (error) {
            console.error("Error fetching modules:", error);
            // alert("Failed to fetch modules");
        } finally {
            setLoading(false);
        }
    };

    // Module operations
    const handleToggleModule = (id: string) => {
        setModules(modules.map(m => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m));
    };

    const handleCollapseAll = () => {
        const allCollapsed = modules.every(m => !m.isExpanded);
        setModules(modules.map(m => ({ ...m, isExpanded: allCollapsed })));
    };

    const handleAddModule = async () => {
        if (!courseId) {
            alert("Course ID is missing");
            return;
        }

        try {
            const tempTitle = `Module ${modules.length + 1}`;
            const cleanCourseId = courseId.replace(/['"]+/g, '');

            const response = await axios.post(`${API_URL}/create_module`, {
                course_id: cleanCourseId,
                title: tempTitle,
                description: 'Dummy description',
                duration: '0s',
            });

            if (response.data) {
                const newModule: Module = {
                    id: response.data._id,
                    title: response.data.title,
                    description: 'Dummy description',
                    duration: 'Dummy duration',
                    items: [],
                    isExpanded: true,
                    learningObjectives: []
                };
                setModules([...modules, newModule]);
            }
        } catch (error: any) {
            console.error("Error creating module:", error);
            alert(`Failed to create module: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteModule = async (id: string) => {
        if (confirm('Are you sure you want to delete this module?')) {
            try {
                await axios.post(`${API_URL}/delete_module`, {
                    module_id: id
                });
                setModules(modules.filter(m => m.id !== id));
            } catch (error) {
                console.error("Error deleting module:", error);
                alert("Failed to delete module");
            }
        }
    };

    const handleEditModule = (module: Module) => {
        setCurrentModule(module);
        setEditModuleModalOpen(true);
    };

    const handleSaveModuleEdit = async (data: { title: string; description: string; duration: string }) => {
        if (currentModule) {
            try {
                await axios.post(`${API_URL}/edit_module`, {
                    module_id: currentModule.id,
                    title: data.title,
                    description: data.description,
                    duration: data.duration
                });

                setModules(modules.map(m =>
                    m.id === currentModule.id
                        ? { ...m, title: data.title, description: data.description, duration: data.duration }
                        : m
                ));
            } catch (error) {
                console.error("Error editing module:", error);
                alert("Failed to edit module");
            }
        }
        setEditModuleModalOpen(false);
        setCurrentModule(null);
    };

    const handleDescriptionChange = (id: string, description: string) => {
        setModules(modules.map(m => m.id === id ? { ...m, description } : m));
    };

    // Item operations
    const handleAddItem = (moduleId: string) => {
        setCurrentModuleForItem(moduleId);
        setAddItemModalOpen(true);
    };


    const handleConfirmAddItem = async (data: { title: string; type: ContentItem['type']; duration: string; file?: File; moduleId: string; courseId: string }) => {
        if (!currentModuleForItem) return;

        try {
            // let azureId = '';

            // // 1. Upload File if present
            // if (data.file) {
            //     const formData = new FormData();
            //     formData.append('file', data.file);
            //     // formData.append('course_id', data.courseId);
            //     // formData.append('module_id', data.moduleId);

            //     // Assuming gateway forwards /material/upload to /api/upload
            //     const uploadResponse = await axios.post(INGEST_URL, formData, {
            //         headers: {
            //             'Content-Type': 'multipart/form-data'
            //         }
            //     });

            //     if (uploadResponse.data && uploadResponse.data.blobName) {
            //         azureId = uploadResponse.data.blobName;
            //     } else {
            //         throw new Error("Upload failed: No blob name received");
            //     }
            // }

            // 2. Call specific API based on type
            let newItem: ContentItem | null = null;
            const uuid = uuidv4();
            if (data.type === 'video') {
                // if (!azureId) {
                //     alert("A video file is required");
                //     return;
                // }
                const response = await axios.post(`${API_URL}/add_video`, {
                    module_id: currentModuleForItem,
                    azure_id: uuid,
                    title: data.title
                }, {
                    withCredentials: true
                });
                console.log(response.data)
                let response2
                if (data.file) {
                    const formData = new FormData();
                    formData.append('file', data.file);
                    formData.append('module_id', currentModuleForItem);
                    formData.append('course_id', courseId);
                    formData.append('source_type', "video");
                    formData.append('video_id', response.data._id);

                    response2 = await axios.post(`${INGEST_URL}`, formData, {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    console.log(response2.data)
                }
                const response3 = await axios.post(`${API_URL}/update_material`, {
                    material_id: response.data._id,
                    azure_id: response2?.data.blob_name,
                    type: 'video'
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                })

                console.log(response3.data)
                // Map backend video to frontend item
                newItem = {
                    id: response.data._id,
                    type: 'video',
                    title: response.data.title,
                    duration: data.duration || '0m', // Backend doesn't store duration yet
                    fileName: data.file?.name,
                    azureId: response3.data.azure_id
                };

            } else if (data.type === 'reading') { // Notes
                const response = await axios.post(`${API_URL}/add_notes`, {
                    module_id: currentModuleForItem,
                    azure_id: uuid,
                    title: data.title
                }, {
                    withCredentials: true
                });
                console.log(response.data)
                let response2
                if (data.file) {
                    console.log(courseId, "courseid", currentModuleForItem, "moduleid", response.data._id, "responseid")
                    const formData = new FormData();
                    formData.append('file', data.file);
                    formData.append('module_id', currentModuleForItem);
                    formData.append('course_id', courseId);
                    formData.append('source_type', "notes");
                    formData.append('notes_id', response.data._id);

                    response2 = await axios.post(`${INGEST_URL}`, formData, {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    console.log(response2.data)
                }
                const response3 = await axios.post(`${API_URL}/update_material`, {
                    material_id: response.data._id,
                    azure_id: response2?.data.blob_name,
                    type: 'notes'
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                })

                console.log(response3.data)
                newItem = {
                    id: response.data._id,
                    type: 'reading',
                    title: response.data.title,
                    duration: data.duration || '0m', // Backend doesn't store duration yet
                    fileName: data.file?.name,
                    azureId: response3.data.azure_id
                };
            } else {
                // Fallback for other types (Quiz/Assignment) - Local only for now as no API
                newItem = {
                    id: `item-${Date.now()}`,
                    type: data.type,
                    title: data.title,
                    duration: data.duration,
                    fileName: data.file?.name
                };
            }

            if (newItem) {
                const itemToAdd = newItem; // Capture for closure if needed, though clean here
                setModules(modules.map(m =>
                    m.id === currentModuleForItem
                        ? { ...m, items: [...m.items, itemToAdd] }
                        : m
                ));
            }

        } catch (error: any) {
            console.error("Error adding item:", error);
            alert(`Failed to add item: ${error.response?.data?.message || error.message}`);
        }

        setAddItemModalOpen(false);
        setCurrentModuleForItem(null);
    };

    const handleDeleteItem = (moduleId: string, itemId: string, type: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                if (type === 'video') {
                    axios.post(`${API_URL}/delete_video`, {
                        video_id: itemId
                    }, {
                        withCredentials: true
                    });
                }
                else if (type === 'reading') {
                    axios.post(`${API_URL}/delete_notes`, {
                        notes_id: itemId
                    }, {
                        withCredentials: true
                    });
                }
            } catch (error) {
                console.error("Error deleting item:", error);
            }
            setModules(modules.map(m =>
                m.id === moduleId
                    ? { ...m, items: m.items.filter(i => i.id !== itemId) }
                    : m
            ));
        }
    };

    const handleEditItem = (item: ContentItem, parentId: string) => {
        setCurrentItem({ item, parentId });
        setEditItemModalOpen(true);
    };

    const handleSaveItemEdit = (data: { title: string; type: ContentItem['type']; duration: string; file?: File }) => {
        if (currentItem) {
            setModules(modules.map(m =>
                m.id === currentItem.parentId
                    ? {
                        ...m,
                        items: m.items.map(i =>
                            i.id === currentItem.item.id
                                ? {
                                    ...i,
                                    title: data.title,
                                    type: data.type,
                                    duration: data.duration,
                                    fileName: data.file?.name || i.fileName
                                }
                                : i
                        )
                    }
                    : m
            ));
            alert("Module created and saved successfully!")
        }
        setEditItemModalOpen(false);
        setCurrentItem(null);
    };

    // Inline editing
    const handleStartEdit = (id: string, title: string) => {
        setEditingId(id);
        setEditValue(title);
    };

    const handleSaveEdit = async (id: string, type: 'module' | 'item', parentId?: string) => {
        if (!editValue.trim()) {
            setEditingId(null);
            return;
        }

        if (type === 'module') {
            try {
                await axios.post(`${API_URL}/edit_module`, {
                    module_id: id,
                    title: editValue
                });
                setModules(modules.map(m =>
                    m.id === id ? { ...m, title: editValue } : m
                ));
            } catch (error) {
                console.error("Error editing module inline:", error);
                alert("Failed to update module name");
            }
        } else if (type === 'item' && parentId) {
            // TODO: Implement item edit API (e.g. edit video title) if available
            // For now, only local update
            setModules(modules.map(m =>
                m.id === parentId
                    ? {
                        ...m,
                        items: m.items.map(i =>
                            i.id === id ? { ...i, title: editValue } : i
                        )
                    }
                    : m
            ));
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleReorderModules = (newModules: Module[]) => {
        setModules(newModules);
    };

    // Sidebar handlers
    const handleCloseSidebar = () => {
        setSidebarVisible(false);
    };

    const handleAddRecommendation = (recId: string) => {
        const recommendation = recommendations.find(r => r.id === recId);
        if (recommendation) {
            alert(`Adding recommendation: ${recommendation.title}`);
            // In a real app, this would add the recommendation's modules to the current course
        }
    };

    const COURSES_API_URL = "http://localhost:4000/material/courses";

    const handleSaveCourseContent = async () => {
        if (!courseId) return;

        try {
            const cleanCourseId = courseId.replace(/['"]+/g, '');
            // Extract module IDs in current order
            const moduleIds = modules.map(m => m.id);

            // 1. Save Course Structure (Order)
            await axios.post(`${COURSES_API_URL}/edit_course`, {
                course_id: cleanCourseId,
                module_id: moduleIds
            });

            // 2. Save Each Module's Details (Title, Description, etc.)
            // We use Promise.all to save them in parallel
            await Promise.all(modules.map(m =>
                axios.post(`${API_URL}/edit_module`, {
                    module_id: m.id,
                    title: m.title,
                    description: m.description, // detailed description from textarea
                    duration: m.duration || '0m'
                })
            ));

            alert("Course content saved successfully!");
        } catch (error) {
            console.error("Error saving course content:", error);
            alert("Failed to save course content.");
        }
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-white">
            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Hidden on mobile by default, shown when toggled */}
            {sidebarVisible && (
                <CreationSidebar
                    className={`fixed top-16 bottom-0 left-0 z-40 w-[85vw] md:w-[360px] md:relative md:top-0 md:h-full transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
                    onBack={() => setSidebarVisible(false)}
                    guidedSteps={guidedSteps}
                    recommendations={recommendations}
                    onAddRecommendation={handleAddRecommendation}
                    onClose={() => setIsSidebarOpen(false)}
                    courseTitle="My New Course"
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <ModuleList
                    modules={modules}
                    editingId={editingId}
                    editValue={editValue}
                    onToggleModule={handleToggleModule}
                    onStartEdit={handleStartEdit}
                    onEditValueChange={setEditValue}
                    onSaveEdit={handleSaveEdit}
                    onDeleteModule={handleDeleteModule}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onAddModule={handleAddModule}
                    onCollapseAll={handleCollapseAll}
                    onReorderModules={handleReorderModules}
                    onDescriptionChange={handleDescriptionChange}
                    onEditModule={handleEditModule}
                    onEditItem={handleEditItem}
                    onSaveCourseContent={handleSaveCourseContent}
                />

                {/* Mobile Footer Navbar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center justify-end z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                    >
                        <span className="text-sm font-medium">Tools</span>
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            <EditModuleModal
                isOpen={editModuleModalOpen}
                onClose={() => {
                    setEditModuleModalOpen(false);
                    setCurrentModule(null);
                }}
                onConfirm={handleSaveModuleEdit}
                module={currentModule}
            />

            <AddItemModal
                isOpen={addItemModalOpen}
                onClose={() => {
                    setAddItemModalOpen(false);
                    setCurrentModuleForItem(null);
                }}
                onConfirm={(data) => {
                    if (currentModuleForItem) {
                        handleConfirmAddItem({
                            ...data,
                            moduleId: currentModuleForItem,
                            courseId: courseId
                        });
                    }
                }}
            />

            <EditContentItemModal
                isOpen={editItemModalOpen}
                onClose={() => {
                    setEditItemModalOpen(false);
                    setCurrentItem(null);
                }}
                onConfirm={handleSaveItemEdit}
                item={currentItem?.item || null}
            />
        </div>
    );
}

export default function ModulesPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-white">Loading...</div>}>
            <ModulesPageContent />
        </Suspense>
    );
}