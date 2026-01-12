'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

function TestResultPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const testId = searchParams.get('test_id');
    const userId = searchParams.get('user_id');

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResult = async () => {
            if (!testId || !userId) {
                setError("Missing test_id or user_id");
                setLoading(false);
                return;
            }

            try {
                const response = await axios.post("http://localhost:4000/material/tests/get-student-result", {
                    test_id: testId,
                    user_id: userId
                }, { withCredentials: true });

                const data = response.data;
                // Handle potential array or object response
                if (data) {
                    const resObj = Array.isArray(data) ? data[0] : data;
                    if (resObj) {
                        setResult(resObj);
                    } else {
                        setError("Result not found.");
                    }
                } else {
                    setError("Result not found.");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch result. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [testId, userId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                <p>Loading your results...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Results</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button onClick={() => router.back()} className="text-indigo-600 font-semibold hover:underline">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!result) return null;

    // Combine questions and answers
    const qaPairs = result.questions?.map((q: string, i: number) => ({
        question: q,
        answer: result.answers?.[i] || "No answer recorded"
    })) || [];

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Card */}
                <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-500 to-indigo-600"></div>

                    <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Course
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">Assessment Result</h1>
                            <p className="text-lg text-gray-500">Detailed breakdown of your performance</p>
                        </div>

                        {/* Score Badge */}
                        {typeof result.marks === 'number' && (
                            <div className="flex items-center gap-4 bg-indigo-50 px-6 py-4 rounded-xl border border-indigo-100 shadow-sm">
                                <div className="text-indigo-600">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Score Obtained</p>
                                    <p className="text-3xl font-black text-indigo-900">{result.marks}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* QA List */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 px-2">Question Breakdown</h2>
                    {qaPairs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                            No questions data available.
                        </div>
                    ) : (
                        qaPairs.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex gap-4">
                                    <span className="shrink-0 w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                                        {idx + 1}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 pt-1 leading-snug">{item.question}</h3>
                                </div>
                                <div className="p-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Answer</h4>
                                    <p className="text-gray-600 leading-relaxed italic border-l-4 border-indigo-200 pl-4">
                                        "{item.answer}"
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TestResultPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
            <TestResultPageContent />
        </Suspense>
    );
}
