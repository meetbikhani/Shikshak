'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Search, User, FileText, CheckCircle } from 'lucide-react';
import { dummyTests, dummySubmissions, dummyQuestions, Test, StudentSubmission, Question } from '@/types/test';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useAppStore } from '@/store/useAppStore';

function TestPreviewPageContent() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;
    const searchParams = useSearchParams();
    const { profile, user } = useAppStore()

    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null); // Changed from studentId to resultId for uniqueness
    const [searchTerm, setSearchTerm] = useState('');
    const [testIds, setTestIds] = useState<any[]>([])
    const [results, setResults] = useState<any[]>([]); // Store real results

    // Derived state
    // Find the full test object if needed, though we rely on results mostly now
    const selectedTest = testIds.find(t => t._id === selectedTestId);

    // Filter results by search
    const displayedResults = results.filter(res =>
        res.user_id?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedResult = results.find(r => r._id === selectedResultId);

    // Grading State (Local)
    const [marks, setMarks] = useState<Record<string, number | string>>({});

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                const response = await axios.post(`http://localhost:4000/material/courses/get_course_by_id`, {
                    course_id: courseId,
                    user_id: user?.id,
                    user_role: profile?.role
                }, {
                    headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
                    withCredentials: true
                });
                setTestIds(response.data.test_id || [])
            } catch (error) {
                console.error("Error fetching course data:", error);
            }
        }
        if (courseId) fetchCourseData()
    }, [courseId, user?.id, profile?.role]);

    // Initialize marks when selected result changes
    useEffect(() => {
        if (selectedResult) {
            const initialMarks: Record<string, number> = {};
            const hasExistingMarks = selectedResult.marks !== null && selectedResult.marks !== undefined;
            const prefillValue = hasExistingMarks ? Number(selectedResult.marks) : 0;

            selectedResult.questions?.forEach((_: any, idx: number) => {
                // If marks exist (normalized to 10), assign that value to each question
                // Since each question is out of 10, and the total is out of 10, 
                // the average score per question matches the normalized total.
                initialMarks[idx] = prefillValue;
            });
            setMarks(initialMarks);
        } else {
            setMarks({});
        }
    }, [selectedResult]);

    const handleMarkChange = (questionIndex: string, val: string, max: number) => {
        if (val === '') {
            setMarks(prev => ({ ...prev, [questionIndex]: '' }));
            return;
        }
        const numVal = parseFloat(val);
        if (isNaN(numVal)) return;
        if (numVal < 0) return;
        if (numVal > max) return;
        setMarks(prev => ({ ...prev, [questionIndex]: numVal }));
    };

    // Calculate totals
    // Mock Max Marks per question since backend doesn't provide it in the Result object
    const DEFAULT_MAX_MARKS = 10;

    // Determine questions array from selected result
    const currentQuestions = selectedResult?.questions || [];

    const totalObtained = Object.values(marks).reduce((acc: number, curr: number | string) => {
        const val = typeof curr === 'string' ? 0 : curr;
        return acc + val;
    }, 0);

    const totalMax = currentQuestions.length * DEFAULT_MAX_MARKS;
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';

    // Mobile View State
    const [mobileView, setMobileView] = useState<'tests' | 'students' | 'grading'>('tests');

    // Save Success Popup State
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!selectedResultId) return;

        try {
            // Normalize score to 0-10 range before sending
            // If totalMax is 0 (no questions), avoid division by zero
            // (totalObtained / totalMax) * 10
            const normalizedScore = totalMax > 0 ? (totalObtained / totalMax) * 10 : 0;

            console.log("Saving result:", selectedResultId, "Raw:", totalObtained, "Normalized:", normalizedScore);

            await axios.post('http://localhost:4000/material/tests/give-marks', {
                result_id: selectedResultId,
                marks: Number(normalizedScore.toFixed(2))
            }, { withCredentials: true });

            setShowSuccess(true);

            // Update local state to reflect the change immediately
            setResults(prevResults => prevResults.map(r =>
                r._id === selectedResultId ? { ...r, marks: normalizedScore } : r
            ));
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);

            // Optionally refresh results to show updated status if we were tracking it
        } catch (error) {
            console.error("Failed to save marks:", error);
            alert("Failed to save marks. Please try again.");
        }
    };

    const getresults = async (testId: string) => {
        try {
            const response = await axios.post(`http://localhost:4000/material/tests/get-results`, {
                test_id: testId,
            }, { withCredentials: true });

            if (response.data.success) {
                setResults(response.data.results);
            }
        } catch (error) {
            console.error("Error fetching results:", error);
            setResults([]);
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
            {/* Success Popup */}
            {showSuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span className="font-bold">Grading Saved Successfully!</span>
                </div>
            )}

            <main className="flex-1 flex overflow-hidden relative">
                {/* 1. Tests List (Left Sidebar) */}
                <div className={`
                    w-full lg:w-[300px] bg-white border-r border-gray-200 flex-col shrink-0
                    ${mobileView === 'tests' ? 'flex' : 'hidden lg:flex'}
                `}>
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <h2 className="font-bold text-lg">Course Tests</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {testIds.length === 0 && (
                            <div className="p-4 text-gray-400 text-sm text-center">No tests found for this course.</div>
                        )}
                        {testIds.map((test, index) => (
                            <div
                                key={test._id || index}
                                onClick={() => {
                                    setSelectedTestId(test._id);
                                    setSelectedResultId(null);
                                    setResults([]); // Clear previous results
                                    setMobileView('students');
                                    getresults(test._id)
                                }}
                                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${selectedTestId === test._id ? 'bg-orange-50 border-orange-200' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <h4 className='font-semibold text-sm mb-1'>Test {index + 1}</h4>
                                <h3 className={`font-semibold text-sm mb-1 ${selectedTestId === test._id ? 'text-orange-800' : 'text-gray-800'}`}>
                                    {test.title}
                                </h3>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Student List (Middle Panel) */}
                <div className={`
                    w-full lg:w-[320px] bg-white border-r border-gray-200 flex-col shrink-0 z-10
                    ${mobileView === 'students' ? 'flex' : 'hidden lg:flex'}
                `}>
                    {selectedTestId ? (
                        <>
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-center gap-2 mb-3 lg:hidden">
                                    <button onClick={() => setMobileView('tests')} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <span className="text-xs font-bold text-gray-400 uppercase">Back to Tests</span>
                                </div>
                                <h3 className="font-bold text-gray-800 mb-3">{selectedTest?.title || 'Test Results'}</h3>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search student..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {displayedResults.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        No submissions found.
                                    </div>
                                ) : (
                                    displayedResults.map(res => (
                                        <div
                                            key={res._id}
                                            onClick={() => {
                                                setSelectedResultId(res._id);
                                                setMobileView('grading');
                                            }}
                                            className={`p-3 mx-2 my-1 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${selectedResultId === res._id ? 'bg-orange-50 w-[calc(100%-16px)]' : 'hover:bg-gray-50 w-[calc(100%-16px)]'
                                                }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${selectedResultId === res._id ? 'text-orange-900' : 'text-gray-900'}`}>
                                                    {res.user_id?.name || 'Unknown Student'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Submitted {new Date(res.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <CheckCircle className={`w-4 h-4 ${res.marks !== null ? 'text-orange-400' : 'text-gray-200'}`} />
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 italic">
                            Select a test to view submissions
                        </div>
                    )}
                </div>

                {/* 3. Grading Area (Right Main Panel) */}
                <div className={`
                    flex-1 flex-col bg-slate-50 overflow-hidden
                    ${mobileView === 'grading' ? 'flex absolute inset-0 z-20 lg:static' : 'hidden lg:flex'}
                `}>
                    {selectedResult ? (
                        <>
                            {/* Header */}
                            <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 lg:hidden">
                                    <button onClick={() => setMobileView('students')} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <span className="text-xs font-bold text-gray-400 uppercase">Back to Students</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-xl font-bold text-gray-900">{selectedResult.user_id?.name}'s Submission</h1>
                                        <p className="text-sm text-gray-500">Test: {selectedTest?.title}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        {selectedResult.marks !== null && (
                                            <div className="text-right hidden xl:block">
                                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Saved Grade</p>
                                                <p className="text-2xl font-black text-indigo-600 leading-none">
                                                    {selectedResult.marks} <span className="text-lg text-gray-400 font-medium">/ 10</span>
                                                </p>
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Score</p>
                                            <p className="text-2xl font-black text-orange-600 leading-none">
                                                {totalObtained} <span className="text-lg text-gray-400 font-medium">/ {totalMax}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Percentage</p>
                                            <p className="text-2xl font-black text-emerald-600 leading-none">{percentage}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Questions List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 max-w-4xl mx-auto w-full">
                                {currentQuestions.map((qText: string, idx: number) => {
                                    // Use index to pair question with answer since they are parallel arrays
                                    const answerText = selectedResult.answers && selectedResult.answers[idx];
                                    const currentMark = marks[idx] ?? 0;

                                    return (
                                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden transition-all hover:shadow-md">
                                            <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 flex justify-between items-start gap-4">
                                                <div className="flex gap-4">
                                                    <div className="flex flex-col items-center justify-center bg-white border border-gray-200 text-gray-500 font-bold text-xs w-10 h-10 rounded-lg shadow-sm shrink-0">
                                                        <span>Q{idx + 1}</span>
                                                    </div>
                                                    <p className="font-medium text-gray-800 text-lg leading-snug mt-1">{qText}</p>
                                                </div>
                                                <div className="shrink-0 flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Max Marks</span>
                                                    <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                                        {DEFAULT_MAX_MARKS}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-6 sm:p-8">
                                                <div className="mb-8">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <FileText className="w-3 h-3" /> Student Answer
                                                    </h4>
                                                    <div className="p-6 bg-white rounded-xl text-gray-700 text-base leading-relaxed border border-gray-100 shadow-inner relative group">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-200 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                        {answerText ? answerText : <span className="text-gray-400 italic font-medium">No answer provided by student.</span>}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end gap-4 pt-6 border-t border-dashed border-gray-100">
                                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Marks</label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={DEFAULT_MAX_MARKS}
                                                                value={currentMark}
                                                                onChange={(e) => handleMarkChange(idx.toString(), e.target.value, DEFAULT_MAX_MARKS)}
                                                                className="w-24 pl-4 pr-3 py-2.5 bg-gray-50 border-2 border-transparent hover:bg-white hover:border-orange-100 focus:bg-white focus:border-orange-400 rounded-xl text-right font-bold text-xl text-gray-900 focus:outline-none transition-all focus:ring-4 focus:ring-orange-500/10 placeholder-gray-300"
                                                                placeholder="-"
                                                            />
                                                        </div>
                                                        <span className="text-xl font-medium text-gray-300">/</span>
                                                        <span className="text-xl font-bold text-gray-400">{DEFAULT_MAX_MARKS}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="flex justify-end gap-4 mt-8 pb-12">
                                    <button className="px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-bold shadow-sm hover:bg-gray-50 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Grading'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        selectedTestId && !selectedResultId && (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <User className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Select a Student</h3>
                                <p className="text-gray-500 text-sm">Choose a student from the list to start grading.</p>
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
}

export default function TestPreviewPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50">Loading...</div>}>
            <TestPreviewPageContent />
        </Suspense>
    );
}
